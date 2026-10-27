using Bramhand.Api.Data;
using Bramhand.Api.DTOs;
using Bramhand.Api.Hubs;
using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleNames.AdminOrManager)]
public class BillsController(
    AppDbContext db,
    IAuditService audit,
    IRealtimeService realtime) : ControllerBase
{
    [HttpPost("order/{orderId:int}")]
    public async Task<ActionResult<BillDto>> CreateBill(int orderId, [FromBody] CreateBillRequest request)
    {
        var order = await db.Orders
            .Include(o => o.Table).ThenInclude(t => t.Floor)
            .Include(o => o.Captain)
            .Include(o => o.Items).ThenInclude(i => i.TakenByUser)
            .Include(o => o.Bill)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound();
        if (order.Status == OrderStatus.Closed)
            return BadRequest(new { message = "Order already closed" });
        if (order.Bill is not null)
            return Conflict(new { message = "Bill already exists", billId = order.Bill.Id });
        if (request.PaymentMode == PaymentMode.Part)
            return BadRequest(new { message = "Choose Cash, UPI, or Card to settle the full bill" });

        var settings = await db.Settings.FirstAsync();
        var activeItems = order.Items.Where(i => i.Status != OrderItemStatus.Cancelled).ToList();
        var subtotal = activeItems.Sum(i => i.UnitPrice * i.Quantity);

        var discount = request.DiscountAmount;
        if (request.DiscountPercent > 0)
            discount = Math.Round(subtotal * request.DiscountPercent / 100m, 2);

        var afterDiscount = Math.Max(0, subtotal - discount);
        const decimal serviceCharge = 500m;
        var taxable = afterDiscount + serviceCharge;
        var cgst = Math.Round(taxable * settings.DefaultCgstPercent / 100m, 2);
        var sgst = Math.Round(taxable * settings.DefaultSgstPercent / 100m, 2);
        var rawTotal = taxable + cgst + sgst;
        var total = Math.Round(rawTotal, MidpointRounding.AwayFromZero);
        var roundOff = total - rawTotal;

        var bill = new Bill
        {
            OrderId = order.Id,
            BillNumber = await NextBillNumberAsync(settings.BillPrefix),
            Subtotal = subtotal,
            DiscountAmount = discount,
            DiscountPercent = request.DiscountPercent,
            ServiceCharge = serviceCharge,
            Cgst = cgst,
            Sgst = sgst,
            RoundOff = roundOff,
            Total = total,
            PaymentMode = request.PaymentMode,
            PaidAmount = request.PaidAmount ?? 0,
            PrintedByUserId = User.GetUserId(),
            PrintCount = 0
        };

        order.Status = OrderStatus.Billing;
        order.Table.Status = TableStatus.Billing;

        if (request.PaymentMode.HasValue && (request.PaidAmount ?? 0) >= total)
        {
            bill.PaidAmount = total;
            bill.PaidAt = DateTime.UtcNow;
            order.Status = OrderStatus.Closed;
            order.ClosedAt = DateTime.UtcNow;
            order.Table.Status = TableStatus.Vacant;
        }

        db.Bills.Add(bill);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "BILL_CREATE", $"Bill {bill.BillNumber}");

        var dto = await LoadBillDto(bill.Id);
        await realtime.TablesUpdatedAsync();
        await realtime.OrderUpdatedAsync(dto!.Order);
        return Ok(dto);
    }

    [HttpPost("{id:int}/pay")]
    public async Task<ActionResult<BillDto>> Pay(int id, [FromBody] CreateBillRequest request)
    {
        var bill = await db.Bills
            .Include(b => b.Order).ThenInclude(o => o.Table)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (bill is null) return NotFound();

        if (bill.PaidAt is not null)
            return Conflict(new { message = "Bill is already settled" });

        var paidAmount = request.PaidAmount ?? bill.Total;
        if (paidAmount < bill.Total)
            return BadRequest(new { message = "Full bill amount is required to settle this bill" });
        if (request.PaymentMode is null && bill.PaymentMode is null)
            return BadRequest(new { message = "Select Cash, UPI, or Card before settling the bill" });
        if (request.PaymentMode == PaymentMode.Part || bill.PaymentMode == PaymentMode.Part)
            return BadRequest(new { message = "Choose Cash, UPI, or Card to settle the full bill" });

        bill.PaymentMode = request.PaymentMode ?? bill.PaymentMode;
        bill.PaidAmount = bill.Total;
        bill.PaidAt = DateTime.UtcNow;
        bill.Order.Status = OrderStatus.Closed;
        bill.Order.ClosedAt = DateTime.UtcNow;
        bill.Order.Table.Status = TableStatus.Vacant;

        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "BILL_PAY", $"Bill {bill.BillNumber} via {bill.PaymentMode}");
        await realtime.TablesUpdatedAsync();

        var dto = await LoadBillDto(bill.Id);
        await realtime.OrderUpdatedAsync(dto!.Order);
        return Ok(dto);
    }

    [HttpPost("{id:int}/print")]
    public async Task<ActionResult<BillDto>> Print(int id)
    {
        var bill = await db.Bills.FindAsync(id);
        if (bill is null) return NotFound();

        bill.PrintCount += 1;
        bill.PrintedByUserId = User.GetUserId();
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "BILL_PRINT", $"Bill {bill.BillNumber} print #{bill.PrintCount}");

        var dto = await LoadBillDto(bill.Id);
        return Ok(dto);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BillDto>> Get(int id)
    {
        var dto = await LoadBillDto(id);
        if (dto is null) return NotFound();
        return Ok(dto);
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<ActionResult<BillDto>> GetByOrder(int orderId)
    {
        var billId = await db.Bills.Where(b => b.OrderId == orderId).Select(b => b.Id).FirstOrDefaultAsync();
        if (billId == 0) return NotFound();
        return Ok(await LoadBillDto(billId));
    }

    private async Task<BillDto?> LoadBillDto(int billId)
    {
        var bill = await db.Bills
            .Include(b => b.Order).ThenInclude(o => o.Table).ThenInclude(t => t.Floor)
            .Include(b => b.Order).ThenInclude(o => o.Captain)
            .Include(b => b.Order).ThenInclude(o => o.Items).ThenInclude(i => i.TakenByUser)
            .FirstOrDefaultAsync(b => b.Id == billId);
        return bill?.ToDto();
    }

    private async Task<string> NextBillNumberAsync(string prefix)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await db.Bills.CountAsync(b => b.BillNumber.StartsWith($"{prefix}-{today}")) + 1;
        return $"{prefix}-{today}-{count:D4}";
    }
}

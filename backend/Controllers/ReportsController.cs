using Bramhand.Api.Data;
using Bramhand.Api.Models;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = RoleNames.AdminOrManager)]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        if (from == default || to == default || to < from || to == DateOnly.MaxValue)
            return BadRequest(new { message = "Choose a valid date range" });
        if (to.DayNumber - from.DayNumber > 365)
            return BadRequest(new { message = "Sales reports are limited to 366 days at a time" });

        var start = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var bills = await db.Bills
            .Where(bill => bill.PaidAt != null && bill.PaidAt >= start && bill.PaidAt < end)
            .OrderByDescending(bill => bill.PaidAt)
            .Select(bill => new SalesReportBillDto(
                bill.BillNumber,
                bill.Total,
                bill.PaymentMode.HasValue ? bill.PaymentMode.Value.ToString() : null,
                bill.PaidAt!.Value,
                bill.Order.OrderNumber,
                bill.Order.Table.TableNo,
                bill.Order.Captain.Name))
            .ToListAsync();

        var orders = await db.Orders
            .Include(order => order.Table)
            .Include(order => order.Captain)
            .Include(order => order.Bill)
            .Include(order => order.Items)
            .Where(order => order.CreatedAt >= start && order.CreatedAt < end)
            .OrderByDescending(order => order.CreatedAt)
            .Select(order => new SalesReportOrderDto(
                order.Id,
                order.OrderNumber,
                order.Table.TableNo,
                order.Captain.Name,
                order.CreatedAt,
                order.Status.ToString(),
                order.Bill == null ? null : order.Bill.BillNumber,
                order.Bill == null ? null : order.Bill.Total,
                order.Bill == null ? null : order.Bill.PaidAmount,
                order.Bill == null ? null : order.Bill.PaidAt,
                order.Items.OrderBy(item => item.Id)
                    .Select(item => new SalesReportOrderItemDto(
                        item.Id,
                        item.ItemName,
                        item.Quantity,
                        item.UnitPrice,
                        item.Note,
                        item.Status.ToString()))
                    .ToList()))
            .ToListAsync();

        return Ok(new SalesReportDto(
            from,
            to,
            bills.Sum(bill => bill.Total),
            bills.Count,
            bills.Where(bill => bill.PaymentMode is not null)
                .GroupBy(bill => bill.PaymentMode!)
                .ToDictionary(group => group.Key, group => group.Sum(bill => bill.Total)),
            bills,
            orders));
    }
}

public record SalesReportDto(
    DateOnly From,
    DateOnly To,
    decimal TotalSales,
    int BillCount,
    Dictionary<string, decimal> SalesByPaymentMode,
    List<SalesReportBillDto> Bills,
    List<SalesReportOrderDto> Orders);

public record SalesReportBillDto(
    string BillNumber,
    decimal Total,
    string? PaymentMode,
    DateTime PaidAt,
    string OrderNumber,
    string TableNo,
    string CaptainName);

public record SalesReportOrderDto(
    int Id,
    string OrderNumber,
    string TableNo,
    string CaptainName,
    DateTime CreatedAt,
    string Status,
    string? BillNumber,
    decimal? BillTotal,
    decimal? PaidAmount,
    DateTime? PaidAt,
    List<SalesReportOrderItemDto> Items);

public record SalesReportOrderItemDto(
    int Id,
    string ItemName,
    int Quantity,
    decimal UnitPrice,
    string? Note,
    string Status);

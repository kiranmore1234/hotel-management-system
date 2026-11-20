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
[Authorize(Roles = RoleNames.AllStaff)]
public class OrdersController(
    AppDbContext db,
    IAuditService audit,
    IRealtimeService realtime) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "At least one item is required" });

        var table = await db.Tables.Include(t => t.Floor).FirstOrDefaultAsync(t => t.Id == request.TableId && t.IsActive);
        if (table is null) return BadRequest(new { message = "Table not found" });

        var existing = await db.Orders.FirstOrDefaultAsync(o =>
            o.TableId == request.TableId && (o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing));
        if (existing is not null)
            return Conflict(new { message = "Table already has an open order. Use add-items instead.", orderId = existing.Id });

        var menuIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var menuItems = await db.MenuItems
            .Include(m => m.Category)
            .Where(m => menuIds.Contains(m.Id) && m.IsActive && m.IsAvailable)
            .ToDictionaryAsync(m => m.Id);

        if (menuItems.Count != menuIds.Count)
            return BadRequest(new { message = "One or more menu items are unavailable" });

        var userId = User.GetUserId();
        var order = new Order
        {
            OrderNumber = await NextOrderNumberAsync(),
            TableId = table.Id,
            CaptainId = userId,
            Guests = Math.Max(1, request.Guests),
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            Status = OrderStatus.Open,
            KotCounter = 1
        };

        foreach (var line in request.Items)
        {
            var menu = menuItems[line.MenuItemId];
            var price = line.IsHalf && menu.HasHalfFull ? menu.HalfPrice : menu.Price;
            order.Items.Add(new OrderItem
            {
                MenuItemId = menu.Id,
                ItemName = menu.Name + (line.IsHalf ? " (Half)" : ""),
                UnitPrice = price,
                Quantity = Math.Max(1, line.Quantity),
                Note = line.Note,
                IsHalf = line.IsHalf,
                Status = OrderItemStatus.Pending,
                KotNo = 1,
                TakenByUserId = userId
            });
        }

        order.Kots.Add(new Kot
        {
            KotNo = 1,
            Section = string.Join(", ", order.Items
                .Select(i => menuItems[i.MenuItemId].Category.KitchenSection)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct())
        });

        table.Status = TableStatus.Occupied;
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, "ORDER_CREATE", $"Order {order.OrderNumber} on table {table.TableNo}");
        var dto = await LoadOrderDto(order.Id);
        await realtime.TablesUpdatedAsync();
        await realtime.OrderUpdatedAsync(dto!);
        await realtime.KotCreatedAsync(new
        {
            order.Id,
            order.OrderNumber,
            table.TableNo,
            KotNo = 1,
            Items = dto!.Items.Where(i => i.KotNo == 1)
        });

        return Ok(dto);
    }

    [HttpPost("{id:int}/items")]
    public async Task<ActionResult<OrderDto>> AddItems(int id, [FromBody] AddOrderItemsRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "At least one item is required" });

        var order = await db.Orders
            .Include(o => o.Table).ThenInclude(t => t.Floor)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (order.Status != OrderStatus.Open)
            return BadRequest(new { message = "Cannot add items to a closed/billing order" });

        var menuIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var menuItems = await db.MenuItems
            .Include(m => m.Category)
            .Where(m => menuIds.Contains(m.Id) && m.IsActive && m.IsAvailable)
            .ToDictionaryAsync(m => m.Id);

        if (menuItems.Count != menuIds.Count)
            return BadRequest(new { message = "One or more menu items are unavailable" });

        var userId = User.GetUserId();
        order.KotCounter += 1;
        var kotNo = order.KotCounter;
        var newItems = new List<OrderItem>();

        foreach (var line in request.Items)
        {
            var menu = menuItems[line.MenuItemId];
            var price = line.IsHalf && menu.HasHalfFull ? menu.HalfPrice : menu.Price;
            var item = new OrderItem
            {
                OrderId = order.Id,
                MenuItemId = menu.Id,
                ItemName = menu.Name + (line.IsHalf ? " (Half)" : ""),
                UnitPrice = price,
                Quantity = Math.Max(1, line.Quantity),
                Note = line.Note,
                IsHalf = line.IsHalf,
                Status = OrderItemStatus.Pending,
                KotNo = kotNo,
                TakenByUserId = userId
            };
            newItems.Add(item);
            db.OrderItems.Add(item);
        }

        db.Kots.Add(new Kot
        {
            OrderId = order.Id,
            KotNo = kotNo,
            Section = string.Join(", ", newItems
                .Select(i => menuItems[i.MenuItemId].Category.KitchenSection)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct())
        });

        await db.SaveChangesAsync();
        await audit.LogAsync(userId, "ORDER_ADD_ITEMS", $"Order {order.OrderNumber} KOT#{kotNo}");

        var dto = await LoadOrderDto(order.Id);
        await realtime.OrderUpdatedAsync(dto!);
        await realtime.KotCreatedAsync(new
        {
            order.Id,
            order.OrderNumber,
            order.Table.TableNo,
            KotNo = kotNo,
            Items = dto!.Items.Where(i => i.KotNo == kotNo)
        });

        return Ok(dto);
    }

    [HttpGet("table/{tableId:int}")]
    public async Task<ActionResult<OrderDto>> GetByTable(int tableId)
    {
        var order = await db.Orders
            .Where(o => o.TableId == tableId && (o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing))
            .OrderByDescending(o => o.Id)
            .Select(o => o.Id)
            .FirstOrDefaultAsync();

        if (order == 0) return NotFound(new { message = "No running order on this table" });
        var dto = await LoadOrderDto(order);
        return Ok(dto);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var dto = await LoadOrderDto(id);
        if (dto is null) return NotFound();
        return Ok(dto);
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetOpenOrders()
    {
        var ids = await db.Orders
            .Where(o => o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => o.Id)
            .ToListAsync();

        var list = new List<OrderDto>();
        foreach (var id in ids)
        {
            var dto = await LoadOrderDto(id);
            if (dto is not null) list.Add(dto);
        }
        return Ok(list);
    }

    [HttpPut("{orderId:int}/items/{itemId:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<OrderDto>> UpdateItem(int orderId, int itemId, [FromBody] UpdateOrderItemRequest request)
    {
        var order = await db.Orders
            .Include(current => current.Items)
            .Include(current => current.Bill)
            .FirstOrDefaultAsync(current => current.Id == orderId);
        if (order is null) return NotFound();

        var item = order.Items.FirstOrDefault(current => current.Id == itemId);
        if (item is null) return NotFound();
        if (item.Status == OrderItemStatus.Cancelled)
            return BadRequest(new { message = "Cancelled items cannot be edited" });

        item.Quantity = Math.Max(1, request.Quantity);
        item.Note = request.Note;
        if (order.Bill is not null)
            await RecalculateBillAsync(order);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "ORDER_ITEM_EDIT", $"OrderItem {itemId}");

        var dto = await LoadOrderDto(orderId);
        await realtime.OrderUpdatedAsync(dto!);
        return Ok(dto);
    }

    [HttpDelete("{orderId:int}/items/{itemId:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<OrderDto>> CancelItem(int orderId, int itemId)
    {
        var order = await db.Orders
            .Include(current => current.Items)
            .Include(current => current.Bill)
            .FirstOrDefaultAsync(current => current.Id == orderId);
        if (order is null) return NotFound();

        var item = order.Items.FirstOrDefault(current => current.Id == itemId);
        if (item is null) return NotFound();
        if (item.Status == OrderItemStatus.Cancelled)
            return BadRequest(new { message = "Item is already cancelled" });

        item.Status = OrderItemStatus.Cancelled;
        if (order.Bill is not null)
            await RecalculateBillAsync(order);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "ORDER_ITEM_CANCEL", $"OrderItem {itemId} - {item.ItemName}");

        var dto = await LoadOrderDto(orderId);
        await realtime.OrderUpdatedAsync(dto!);
        return Ok(dto);
    }

    [HttpPatch("items/{itemId:int}/status")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<OrderDto>> UpdateItemStatus(int itemId, [FromQuery] OrderItemStatus status)
    {
        var item = await db.OrderItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return NotFound();

        item.Status = status;
        await db.SaveChangesAsync();

        var dto = await LoadOrderDto(item.OrderId);
        await realtime.OrderUpdatedAsync(dto!);
        if (status == OrderItemStatus.Ready)
            await realtime.KotCreatedAsync(new { type = "ready", itemId, orderId = item.OrderId, item.ItemName });

        return Ok(dto);
    }

    private async Task RecalculateBillAsync(Order order)
    {
        var bill = order.Bill!;
        var activeItems = order.Items.Where(item => item.Status != OrderItemStatus.Cancelled);
        var subtotal = activeItems.Sum(item => item.UnitPrice * item.Quantity);
        var discount = bill.DiscountPercent > 0
            ? Math.Round(subtotal * bill.DiscountPercent / 100m, 2)
            : Math.Min(bill.DiscountAmount, subtotal);
        var taxable = Math.Max(0, subtotal - discount) + bill.ServiceCharge;
        var previousTaxable = bill.Subtotal - bill.DiscountAmount + bill.ServiceCharge;

        decimal cgstRate;
        decimal sgstRate;
        if (previousTaxable > 0)
        {
            cgstRate = bill.Cgst / previousTaxable;
            sgstRate = bill.Sgst / previousTaxable;
        }
        else
        {
            var settings = await db.Settings.FirstAsync();
            cgstRate = settings.DefaultCgstPercent / 100m;
            sgstRate = settings.DefaultSgstPercent / 100m;
        }

        var cgst = Math.Round(taxable * cgstRate, 2);
        var sgst = Math.Round(taxable * sgstRate, 2);
        var rawTotal = taxable + cgst + sgst;
        var total = Math.Round(rawTotal, MidpointRounding.AwayFromZero);

        bill.Subtotal = subtotal;
        bill.DiscountAmount = discount;
        bill.Cgst = cgst;
        bill.Sgst = sgst;
        bill.RoundOff = total - rawTotal;
        bill.Total = total;
    }

    private async Task<OrderDto?> LoadOrderDto(int orderId)
    {
        var order = await db.Orders
            .Include(o => o.Table).ThenInclude(t => t.Floor)
            .Include(o => o.Captain)
            .Include(o => o.Items).ThenInclude(i => i.TakenByUser)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        return order?.ToDto();
    }

    private async Task<string> NextOrderNumberAsync()
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await db.Orders.CountAsync(o => o.OrderNumber.StartsWith($"ORD-{today}")) + 1;
        return $"ORD-{today}-{count:D4}";
    }
}

using Bramhand.Api.DTOs;
using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;

namespace Bramhand.Api.Services;

public static class Mappers
{
    public static TableDto ToDto(this RestaurantTable table, int? activeOrderId = null) => new(
        table.Id,
        table.FloorId,
        table.Floor?.Name ?? "",
        table.TableNo,
        table.Capacity,
        table.Status.ToString(),
        activeOrderId);

    public static MenuItemDto ToDto(this MenuItem item) => new(
        item.Id,
        item.CategoryId,
        item.Category?.Name ?? "",
        item.Name,
        item.Description,
        item.Price,
        item.HalfPrice,
        item.TaxPercent,
        item.VegType.ToString(),
        item.ImageUrl,
        item.IsAvailable,
        item.HasHalfFull);

    public static OrderItemDto ToDto(this OrderItem item) => new(
        item.Id,
        item.MenuItemId,
        item.ItemName,
        item.UnitPrice,
        item.Quantity,
        item.Note,
        item.IsHalf,
        item.Status.ToString(),
        item.KotNo,
        item.TakenByUser?.Name,
        item.CreatedAt,
        item.UnitPrice * item.Quantity);

    public static OrderDto ToDto(this Order order)
    {
        var items = order.Items
            .Where(i => i.Status != OrderItemStatus.Cancelled)
            .Select(i => i.ToDto())
            .ToList();

        return new OrderDto(
            order.Id,
            order.OrderNumber,
            order.TableId,
            order.Table?.TableNo ?? "",
            order.Table?.Floor?.Name ?? "",
            order.CaptainId,
            order.Captain?.Name ?? "",
            order.Status.ToString(),
            order.Guests,
            order.CustomerName,
            order.CustomerPhone,
            order.KotCounter,
            order.CreatedAt,
            items,
            items.Sum(i => i.LineTotal));
    }

    public static BillDto ToDto(this Bill bill) => new(
        bill.Id,
        bill.OrderId,
        bill.BillNumber,
        bill.Subtotal,
        bill.DiscountAmount,
        bill.DiscountPercent,
        bill.ServiceCharge,
        bill.Cgst,
        bill.Sgst,
        bill.RoundOff,
        bill.Total,
        bill.PaymentMode?.ToString(),
        bill.PaidAmount,
        bill.PrintCount,
        bill.CreatedAt,
        bill.PaidAt,
        bill.Order.ToDto());
}

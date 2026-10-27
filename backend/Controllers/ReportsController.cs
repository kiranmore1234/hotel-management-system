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

        return Ok(new SalesReportDto(
            from,
            to,
            bills.Sum(bill => bill.Total),
            bills.Count,
            bills.Where(bill => bill.PaymentMode is not null)
                .GroupBy(bill => bill.PaymentMode!)
                .ToDictionary(group => group.Key, group => group.Sum(bill => bill.Total)),
            bills));
    }
}

public record SalesReportDto(
    DateOnly From,
    DateOnly To,
    decimal TotalSales,
    int BillCount,
    Dictionary<string, decimal> SalesByPaymentMode,
    List<SalesReportBillDto> Bills);

public record SalesReportBillDto(
    string BillNumber,
    decimal Total,
    string? PaymentMode,
    DateTime PaidAt,
    string OrderNumber,
    string TableNo,
    string CaptainName);

using Bramhand.Api.Data;
using Bramhand.Api.DTOs;
using Bramhand.Api.Models;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleNames.AdminOrManager)]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        var start = DateTime.UtcNow.Date;
        var end = start.AddDays(1);

        var todayBills = await db.Bills
            .Where(b => b.PaidAt != null && b.PaidAt >= start && b.PaidAt < end)
            .ToListAsync();

        var historyStart = start.AddDays(-6);
        var paidSales = await db.Bills
            .Where(b => b.PaidAt != null && b.PaidAt >= historyStart && b.PaidAt < end)
            .Select(b => new { b.PaidAt, b.Total })
            .ToListAsync();
        var salesByDate = paidSales
            .GroupBy(b => b.PaidAt!.Value.Date)
            .ToDictionary(group => group.Key, group => group.Sum(b => b.Total));
        var dailySales = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = historyStart.AddDays(offset);
                return new DailySaleDto(date, salesByDate.GetValueOrDefault(date));
            })
            .ToList();

        var todayOrders = await db.Orders.CountAsync(o => o.CreatedAt >= start && o.CreatedAt < end);
        var tables = await db.Tables.Include(t => t.Floor).Where(t => t.IsActive).ToListAsync();

        var activeOrderLookup = await db.Orders
            .Where(o => o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing)
            .GroupBy(o => o.TableId)
            .Select(g => new { TableId = g.Key, OrderId = g.Max(x => x.Id) })
            .ToDictionaryAsync(x => x.TableId, x => (int?)x.OrderId);

        var running = tables
            .Where(t => t.Status is TableStatus.Occupied or TableStatus.Billing)
            .Select(t => t.ToDto(activeOrderLookup.GetValueOrDefault(t.Id)))
            .ToList();

        var sale = todayBills.Sum(b => b.Total);
        var billCount = todayBills.Count;

        return Ok(new DashboardDto(
            sale,
            billCount,
            todayOrders,
            billCount == 0 ? 0 : Math.Round(sale / billCount, 2),
            tables.Count(t => t.Status == TableStatus.Vacant),
            tables.Count(t => t.Status == TableStatus.Occupied),
            tables.Count(t => t.Status == TableStatus.Billing),
            running,
            dailySales));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.AllStaff)]
    public async Task<IActionResult> Get()
    {
        var settings = await db.Settings.FirstAsync();
        return Ok(settings);
    }

    [HttpPut]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> Update([FromBody] RestaurantSettingsUpdate request)
    {
        var settings = await db.Settings.FirstAsync();
        settings.RestaurantName = request.RestaurantName;
        settings.Address = request.Address;
        settings.Phone = request.Phone;
        settings.Gstin = request.Gstin;
        settings.DefaultCgstPercent = request.DefaultCgstPercent;
        settings.DefaultSgstPercent = request.DefaultSgstPercent;
        settings.ServiceChargePercent = request.ServiceChargePercent;
        settings.BillPrefix = request.BillPrefix;
        await db.SaveChangesAsync();
        return Ok(settings);
    }
}

public record RestaurantSettingsUpdate(
    string RestaurantName,
    string? Address,
    string? Phone,
    string? Gstin,
    decimal DefaultCgstPercent,
    decimal DefaultSgstPercent,
    decimal ServiceChargePercent,
    string BillPrefix);

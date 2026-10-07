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
public class TablesController(
    AppDbContext db,
    IAuditService audit,
    IRealtimeService realtime) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<FloorDto>>> GetFloorsWithTables()
    {
        var activeOrderLookup = await db.Orders
            .Where(o => o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing)
            .GroupBy(o => o.TableId)
            .Select(g => new { TableId = g.Key, OrderId = g.Max(x => x.Id) })
            .ToDictionaryAsync(x => x.TableId, x => (int?)x.OrderId);

        var floors = await db.Floors
            .Include(f => f.Tables.Where(t => t.IsActive))
            .Where(f => f.IsActive)
            .OrderBy(f => f.SortOrder)
            .ToListAsync();

        var result = floors.Select(f => new FloorDto(
            f.Id,
            f.Name,
            f.SortOrder,
            f.Tables
                .OrderBy(t => t.TableNo)
                .Select(t => t.ToDto(activeOrderLookup.GetValueOrDefault(t.Id)))
                .ToList()
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TableDto>> GetTable(int id)
    {
        var table = await db.Tables.Include(t => t.Floor).FirstOrDefaultAsync(t => t.Id == id);
        if (table is null) return NotFound();

        var activeOrderId = await db.Orders
            .Where(o => o.TableId == id && (o.Status == OrderStatus.Open || o.Status == OrderStatus.Billing))
            .Select(o => (int?)o.Id)
            .FirstOrDefaultAsync();

        return Ok(table.ToDto(activeOrderId));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<TableDto>> CreateTable([FromBody] CreateTableRequest request)
    {
        var floor = await db.Floors.FindAsync(request.FloorId);
        if (floor is null) return BadRequest(new { message = "Floor not found" });

        var table = new RestaurantTable
        {
            FloorId = request.FloorId,
            TableNo = request.TableNo.Trim(),
            Capacity = request.Capacity
        };
        db.Tables.Add(table);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "TABLE_CREATE", $"Table {table.TableNo}");
        await realtime.TablesUpdatedAsync();

        table.Floor = floor;
        return Ok(table.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> UpdateTable(int id, [FromBody] UpdateTableRequest request)
    {
        var table = await db.Tables.Include(t => t.Floor).FirstOrDefaultAsync(t => t.Id == id);
        if (table is null) return NotFound();

        table.TableNo = request.TableNo.Trim();
        table.Capacity = request.Capacity;
        table.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "TABLE_UPDATE", $"Table {table.TableNo}");
        await realtime.TablesUpdatedAsync();
        return Ok(table.ToDto());
    }

    [HttpPost("floors")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<FloorDto>> CreateFloor([FromBody] CreateFloorRequest request)
    {
        var floor = new Floor { Name = request.Name.Trim(), SortOrder = request.SortOrder };
        db.Floors.Add(floor);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "FLOOR_CREATE", floor.Name);
        return Ok(new FloorDto(floor.Id, floor.Name, floor.SortOrder, []));
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTableStatusRequest request)
    {
        var table = await db.Tables.Include(t => t.Floor).FirstOrDefaultAsync(t => t.Id == id);
        if (table is null) return NotFound();
        table.Status = request.Status;
        await db.SaveChangesAsync();
        await realtime.TablesUpdatedAsync();
        return Ok(table.ToDto());
    }
}

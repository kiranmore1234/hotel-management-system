using Bramhand.Api.Data;
using Bramhand.Api.DTOs;
using Bramhand.Api.Models.Entities;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleNames.AllStaff)]
public class MenuController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> GetMenu([FromQuery] bool includeUnavailable = false)
    {
        var categories = await db.Categories
            .Include(c => c.Items.Where(i => i.IsActive && (includeUnavailable || i.IsAvailable)))
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        // Captains should not see unavailable items
        if (User.IsInRole(RoleNames.Captain))
        {
            foreach (var cat in categories)
                cat.Items = cat.Items.Where(i => i.IsAvailable).ToList();
        }

        var result = categories.Select(c => new CategoryDto(
            c.Id,
            c.Name,
            c.KitchenSection,
            c.SortOrder,
            c.Items.OrderBy(i => i.Name).Select(i => i.ToDto()).ToList()
        )).ToList();

        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<MenuItemDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<MenuItemDto>());

        var query = db.MenuItems
            .Include(i => i.Category)
            .Where(i => i.IsActive && i.IsAvailable && i.Name.Contains(q));

        var items = await query.OrderBy(i => i.Name).Take(30).ToListAsync();
        return Ok(items.Select(i => i.ToDto()).ToList());
    }

    [HttpPost("categories")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name.Trim(),
            KitchenSection = request.KitchenSection,
            SortOrder = request.SortOrder
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "CATEGORY_CREATE", category.Name);
        return Ok(new CategoryDto(category.Id, category.Name, category.KitchenSection, category.SortOrder, []));
    }

    [HttpPost("items")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<MenuItemDto>> CreateItem([FromBody] CreateMenuItemRequest request)
    {
        var category = await db.Categories.FindAsync(request.CategoryId);
        if (category is null) return BadRequest(new { message = "Category not found" });

        var item = new MenuItem
        {
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Description = request.Description,
            Price = request.Price,
            HalfPrice = request.HalfPrice,
            TaxPercent = request.TaxPercent,
            VegType = request.VegType,
            HasHalfFull = request.HasHalfFull,
            IsAvailable = request.IsAvailable
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        item.Category = category;
        await audit.LogAsync(User.GetUserId(), "MENU_CREATE", item.Name);
        return Ok(item.ToDto());
    }

    [HttpPut("items/{id:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<MenuItemDto>> UpdateItem(int id, [FromBody] UpdateMenuItemRequest request)
    {
        var item = await db.MenuItems.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();

        item.Name = request.Name.Trim();
        item.Description = request.Description;
        item.Price = request.Price;
        item.HalfPrice = request.HalfPrice;
        item.TaxPercent = request.TaxPercent;
        item.VegType = request.VegType;
        item.HasHalfFull = request.HasHalfFull;
        item.IsAvailable = request.IsAvailable;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "MENU_UPDATE", item.Name);
        return Ok(item.ToDto());
    }

    [HttpDelete("items/{id:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return NotFound();
        item.IsActive = false;
        item.IsAvailable = false;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "MENU_DELETE", item.Name);
        return NoContent();
    }

    [HttpPatch("items/{id:int}/availability")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<ActionResult<MenuItemDto>> ToggleAvailability(int id, [FromQuery] bool available)
    {
        var item = await db.MenuItems.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();
        item.IsAvailable = available;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "MENU_STOCK", $"{item.Name} => {(available ? "In Stock" : "Out of Stock")}");
        return Ok(item.ToDto());
    }
}

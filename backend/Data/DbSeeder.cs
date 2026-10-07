using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();
        await SeedRegionalMenuAsync(db);
        await DeactivateNonVegAndEggMenuAsync(db);

        if (await db.Users.AnyAsync())
            return;

        var admin = new User
        {
            Name = "Admin",
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            PinHash = BCrypt.Net.BCrypt.HashPassword("1234"),
            Role = UserRole.Admin,
            Phone = "9999999999"
        };

        var manager = new User
        {
            Name = "Manager",
            Username = "manager",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("manager123"),
            PinHash = BCrypt.Net.BCrypt.HashPassword("2222"),
            Role = UserRole.Manager,
            Phone = "9888888888"
        };

        var captain = new User
        {
            Name = "Ravi Captain",
            Username = "captain",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("captain123"),
            PinHash = BCrypt.Net.BCrypt.HashPassword("1111"),
            Role = UserRole.Captain,
            Phone = "9777777777"
        };

        db.Users.AddRange(admin, manager, captain);

        var acHall = new Floor { Name = "AC Hall", SortOrder = 1 };
        var nonAc = new Floor { Name = "Non-AC", SortOrder = 2 };
        var garden = new Floor { Name = "Garden", SortOrder = 3 };
        db.Floors.AddRange(acHall, nonAc, garden);
        await db.SaveChangesAsync();

        var tables = new List<RestaurantTable>();
        for (var i = 1; i <= 8; i++)
            tables.Add(new RestaurantTable { FloorId = acHall.Id, TableNo = $"A{i}", Capacity = i <= 4 ? 4 : 6 });
        for (var i = 1; i <= 6; i++)
            tables.Add(new RestaurantTable { FloorId = nonAc.Id, TableNo = $"N{i}", Capacity = 4 });
        for (var i = 1; i <= 4; i++)
            tables.Add(new RestaurantTable { FloorId = garden.Id, TableNo = $"G{i}", Capacity = 8 });
        db.Tables.AddRange(tables);

        var starters = new Category { Name = "Starters", KitchenSection = "Tandoor", SortOrder = 1 };
        var mainCourse = new Category { Name = "Main Course", KitchenSection = "Indian", SortOrder = 2 };
        var roti = new Category { Name = "Roti", KitchenSection = "Tandoor", SortOrder = 3 };
        var rice = new Category { Name = "Rice", KitchenSection = "Indian", SortOrder = 4 };
        var drinks = new Category { Name = "Drinks", KitchenSection = "Bar", SortOrder = 5 };
        var dessert = new Category { Name = "Dessert", KitchenSection = "Dessert", SortOrder = 6 };
        db.Categories.AddRange(starters, mainCourse, roti, rice, drinks, dessert);
        await db.SaveChangesAsync();

        db.MenuItems.AddRange(
            new MenuItem { CategoryId = starters.Id, Name = "Paneer Tikka", Price = 220, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = starters.Id, Name = "Chicken Tikka", Price = 280, VegType = VegType.NonVeg, TaxPercent = 5 },
            new MenuItem { CategoryId = starters.Id, Name = "Veg Manchurian", Price = 180, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = mainCourse.Id, Name = "Paneer Butter Masala", Price = 240, HalfPrice = 140, HasHalfFull = true, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = mainCourse.Id, Name = "Dal Fry", Price = 160, HalfPrice = 90, HasHalfFull = true, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = mainCourse.Id, Name = "Butter Chicken", Price = 320, HalfPrice = 180, HasHalfFull = true, VegType = VegType.NonVeg, TaxPercent = 5 },
            new MenuItem { CategoryId = roti.Id, Name = "Butter Naan", Price = 50, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = roti.Id, Name = "Tandoori Roti", Price = 25, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = rice.Id, Name = "Jeera Rice", Price = 120, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = rice.Id, Name = "Veg Biryani", Price = 200, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = drinks.Id, Name = "Masala Chai", Price = 30, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = drinks.Id, Name = "Fresh Lime Soda", Price = 60, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = dessert.Id, Name = "Gulab Jamun", Price = 80, VegType = VegType.Veg, TaxPercent = 5 },
            new MenuItem { CategoryId = dessert.Id, Name = "Ice Cream", Price = 100, VegType = VegType.Veg, TaxPercent = 5 }
        );

        db.Settings.Add(new RestaurantSettings
        {
            RestaurantName = "Bramhand",
            Address = "Main Road, India",
            Phone = "1800-000-000",
            Gstin = "22AAAAA0000A1Z5",
            DefaultCgstPercent = 2.5m,
            DefaultSgstPercent = 2.5m,
            ServiceChargePercent = 0,
            BillPrefix = "BH"
        });

        await db.SaveChangesAsync();
        await AddMissingMenuImagesAsync(db);
    }

    private static async Task SeedRegionalMenuAsync(AppDbContext db)
    {
        var maharashtrian = await db.Categories.FirstOrDefaultAsync(c => c.Name == "Maharashtrian");
        if (maharashtrian is null)
        {
            maharashtrian = new Category { Name = "Maharashtrian", KitchenSection = "Indian", SortOrder = 7 };
            db.Categories.Add(maharashtrian);
        }

        var southIndian = await db.Categories.FirstOrDefaultAsync(c => c.Name == "South Indian");
        if (southIndian is null)
        {
            southIndian = new Category { Name = "South Indian", KitchenSection = "Indian", SortOrder = 8 };
            db.Categories.Add(southIndian);
        }

        await db.SaveChangesAsync();

        var dishes = new[]
        {
            new { CategoryId = maharashtrian.Id, Name = "Misal Pav", Description = "Sprouted bean curry with farsan and pav.", Price = 160m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = maharashtrian.Id, Name = "Vada Pav", Description = "Spiced potato fritter in a soft pav.", Price = 60m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = maharashtrian.Id, Name = "Puran Poli", Description = "Sweet lentil-stuffed flatbread.", Price = 90m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = maharashtrian.Id, Name = "Bharli Vangi", Description = "Stuffed brinjal in a Maharashtrian masala.", Price = 190m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = maharashtrian.Id, Name = "Zunka Bhakri", Description = "Gram-flour zunka served with jowar bhakri.", Price = 150m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = maharashtrian.Id, Name = "Kolhapuri Chicken", Description = "Chicken in a bold Kolhapuri spice gravy.", Price = 290m, VegType = VegType.NonVeg, ImageUrl = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Idli Sambar", Description = "Steamed rice cakes with sambar and chutney.", Price = 100m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Masala Dosa", Description = "Crisp dosa filled with spiced potato.", Price = 150m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Medu Vada", Description = "Crisp lentil doughnuts with coconut chutney.", Price = 110m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Vegetable Uttapam", Description = "Soft rice pancake topped with vegetables.", Price = 140m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Lemon Rice", Description = "South Indian tempered rice with lemon.", Price = 130m, VegType = VegType.Veg, ImageUrl = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80" },
            new { CategoryId = southIndian.Id, Name = "Chicken Chettinad", Description = "Chicken curry with roasted Chettinad spices.", Price = 310m, VegType = VegType.NonVeg, ImageUrl = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80" },
        };

        foreach (var dish in dishes)
        {
            if (await db.MenuItems.AnyAsync(item => item.Name == dish.Name))
                continue;

            db.MenuItems.Add(new MenuItem
            {
                CategoryId = dish.CategoryId,
                Name = dish.Name,
                Description = dish.Description,
                Price = dish.Price,
                VegType = dish.VegType,
                ImageUrl = dish.ImageUrl,
                TaxPercent = 5,
            });
        }

        await db.SaveChangesAsync();
        await AddMissingMenuImagesAsync(db);
    }

    private static async Task DeactivateNonVegAndEggMenuAsync(AppDbContext db)
    {
        var items = await db.MenuItems
            .Where(item => item.IsActive && item.VegType != VegType.Veg)
            .ToListAsync();

        foreach (var item in items)
        {
            item.IsActive = false;
        }

        var eggCategory = await db.Categories.FirstOrDefaultAsync(category => category.Name == "Egg Specials");
        if (eggCategory is not null)
            eggCategory.IsActive = false;

        await db.SaveChangesAsync();
    }

    private static async Task AddMissingMenuImagesAsync(AppDbContext db)
    {
        const string vegPhoto = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80";
        const string nonVegPhoto = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80";
        const string rotiPhoto = "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80";
        const string ricePhoto = "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80";
        const string drinksPhoto = "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80";
        const string dessertPhoto = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80";

        var itemsWithoutImages = await db.MenuItems
            .Include(item => item.Category)
            .Where(item => item.ImageUrl == null || item.ImageUrl == "")
            .ToListAsync();

        foreach (var item in itemsWithoutImages)
        {
            item.ImageUrl = item.VegType == VegType.NonVeg
                ? nonVegPhoto
                : item.Category.Name switch
                {
                    "Roti" => rotiPhoto,
                    "Rice" => ricePhoto,
                    "Drinks" => drinksPhoto,
                    "Dessert" => dessertPhoto,
                    _ => vegPhoto,
                };
        }

        if (itemsWithoutImages.Count > 0)
            await db.SaveChangesAsync();
    }
}

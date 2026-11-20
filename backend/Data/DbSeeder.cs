using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();
        if (db.Database.IsSqlite())
            await EnsureUserJobTitleColumnAsync(db);

        await ClearPlaceholderMenuImagesAsync(db);
        var restaurantSettings = await db.Settings.FirstOrDefaultAsync();
        if (restaurantSettings is not null)
        {
            var changed = false;
            if (restaurantSettings.RestaurantName != "Niyojan Resto")
            {
                restaurantSettings.RestaurantName = "Niyojan Resto";
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(restaurantSettings.Address))
            {
                restaurantSettings.Address = "Laxmi Chowk Hinjewadi Pune";
                changed = true;
            }
            if (string.IsNullOrWhiteSpace(restaurantSettings.Phone))
            {
                restaurantSettings.Phone = "8488848987";
                changed = true;
            }
            if (string.IsNullOrWhiteSpace(restaurantSettings.Gstin))
            {
                restaurantSettings.Gstin = "3243";
                changed = true;
            }
            if (restaurantSettings.DefaultCgstPercent == 2.5m && restaurantSettings.DefaultSgstPercent == 2.5m)
            {
                restaurantSettings.DefaultCgstPercent = 5m;
                restaurantSettings.DefaultSgstPercent = 5m;
                changed = true;
            }

            if (changed)
                await db.SaveChangesAsync();
        }

        if (db.Database.IsSqlite())
        {
            await db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "StaffAttendance" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_StaffAttendance" PRIMARY KEY AUTOINCREMENT,
                    "UserId" INTEGER NOT NULL,
                    "StaffName" TEXT NULL,
                    "WorkDate" TEXT NOT NULL,
                    "Status" TEXT NOT NULL,
                    "CheckIn" TEXT NULL,
                    "CheckOut" TEXT NULL,
                    "MarkedAt" TEXT NULL,
                    "Notes" TEXT NULL,
                    "RecordedByUserId" INTEGER NOT NULL,
                    CONSTRAINT "FK_StaffAttendance_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
                    CONSTRAINT "FK_StaffAttendance_Users_RecordedByUserId" FOREIGN KEY ("RecordedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_StaffAttendance_UserId_WorkDate"
                    ON "StaffAttendance" ("UserId", "WorkDate");
                """);
            await EnsureSqliteAttendanceMarkedAtColumnAsync(db);
            await EnsureSqliteAttendanceStaffNameColumnAsync(db);
            await db.Database.ExecuteSqlRawAsync("""
                UPDATE "StaffAttendance"
                SET "StaffName" = (
                    SELECT "Name" FROM "Users" WHERE "Users"."Id" = "StaffAttendance"."UserId"
                )
                WHERE "StaffName" IS NULL;
                """);
        }
        else if (db.Database.IsSqlServer())
        {
            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH(N'dbo.StaffAttendance', N'MarkedAt') IS NULL
                    ALTER TABLE [StaffAttendance] ADD [MarkedAt] datetime2 NULL;
                """);
            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH(N'dbo.StaffAttendance', N'StaffName') IS NULL
                    ALTER TABLE [StaffAttendance] ADD [StaffName] nvarchar(100) NULL;
                """);
            await db.Database.ExecuteSqlRawAsync("""
                UPDATE attendance
                SET [StaffName] = staff.[Name]
                FROM [dbo].[StaffAttendance] AS attendance
                INNER JOIN [dbo].[Users] AS staff ON staff.[Id] = attendance.[UserId]
                WHERE attendance.[StaffName] IS NULL;
                """);
        }
        await SeedRegionalMenuAsync(db);
        await SeedThaliMenuAsync(db);
        await ReactivateNonVegMenuAsync(db);

        if (await db.Users.AnyAsync())
        {
            await SeedAdditionalMenuItemsAsync(db);
            return;
        }

        var admin = new User
        {
            Name = "Admin",
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = UserRole.Admin,
            Phone = "9999999999"
        };

        var manager = new User
        {
            Name = "Manager",
            Username = "manager",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("manager123"),
            Role = UserRole.Manager,
            Phone = "9888888888"
        };

        db.Users.AddRange(admin, manager);

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
            RestaurantName = "Niyojan Resto",
            Address = "Laxmi Chowk Hinjewadi Pune",
            Phone = "8488848987",
            Gstin = "3243",
            DefaultCgstPercent = 5m,
            DefaultSgstPercent = 5m,
            ServiceChargePercent = 0,
            BillPrefix = "NR"
        });

        await db.SaveChangesAsync();
        await SeedAdditionalMenuItemsAsync(db);
    }

    private static async Task EnsureUserJobTitleColumnAsync(AppDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
            await connection.OpenAsync();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA table_info(\"Users\")";
            await using var reader = await command.ExecuteReaderAsync();
            var hasJobTitle = false;
            while (await reader.ReadAsync())
            {
                if (reader.GetString(1) == "JobTitle")
                {
                    hasJobTitle = true;
                    break;
                }
            }

            await reader.DisposeAsync();
            if (!hasJobTitle)
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Users\" ADD COLUMN \"JobTitle\" TEXT NULL");
        }
        finally
        {
            if (closeConnection)
                await connection.CloseAsync();
        }
    }

    private static async Task EnsureSqliteAttendanceMarkedAtColumnAsync(AppDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
            await connection.OpenAsync();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA table_info(\"StaffAttendance\")";
            await using var reader = await command.ExecuteReaderAsync();
            var hasMarkedAt = false;
            while (await reader.ReadAsync())
            {
                if (reader.GetString(1) == "MarkedAt")
                {
                    hasMarkedAt = true;
                    break;
                }
            }

            await reader.DisposeAsync();
            if (!hasMarkedAt)
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"StaffAttendance\" ADD COLUMN \"MarkedAt\" TEXT NULL");
        }
        finally
        {
            if (closeConnection)
                await connection.CloseAsync();
        }
    }

    private static async Task EnsureSqliteAttendanceStaffNameColumnAsync(AppDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
            await connection.OpenAsync();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA table_info(\"StaffAttendance\")";
            await using var reader = await command.ExecuteReaderAsync();
            var hasStaffName = false;
            while (await reader.ReadAsync())
            {
                if (reader.GetString(1) == "StaffName")
                {
                    hasStaffName = true;
                    break;
                }
            }

            await reader.DisposeAsync();
            if (!hasStaffName)
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"StaffAttendance\" ADD COLUMN \"StaffName\" TEXT NULL");
        }
        finally
        {
            if (closeConnection)
                await connection.CloseAsync();
        }
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
            new { CategoryId = maharashtrian.Id, Name = "Misal Pav", Description = "Sprouted bean curry with farsan and pav.", Price = 160m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Vada Pav", Description = "Spiced potato fritter in a soft pav.", Price = 60m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Puran Poli", Description = "Sweet lentil-stuffed flatbread.", Price = 90m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Vada Pav", Description = "Mumbai-style potato fritter tucked into a soft pav.", Price = 60m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Mix Veg", Description = "Seasonal vegetables cooked with a Maharashtrian masala.", Price = 190m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Zunka Bhakri", Description = "Gram-flour zunka served with jowar bhakri.", Price = 150m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = maharashtrian.Id, Name = "Kolhapuri Chicken", Description = "Chicken in a bold Kolhapuri spice gravy.", Price = 290m, VegType = VegType.NonVeg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Idli Sambar", Description = "Steamed rice cakes with sambar and chutney.", Price = 100m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Masala Dosa", Description = "Crisp dosa filled with spiced potato.", Price = 150m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Medu Vada", Description = "Crisp lentil doughnuts with coconut chutney.", Price = 110m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Vegetable Uttapam", Description = "Soft rice pancake topped with vegetables.", Price = 140m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Lemon Rice", Description = "South Indian tempered rice with lemon.", Price = 130m, VegType = VegType.Veg, ImageUrl = (string?)null },
            new { CategoryId = southIndian.Id, Name = "Chicken Chettinad", Description = "Chicken curry with roasted Chettinad spices.", Price = 310m, VegType = VegType.NonVeg, ImageUrl = (string?)null },
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
    }

    private static async Task SeedThaliMenuAsync(AppDbContext db)
    {
        var thalis = await db.Categories.FirstOrDefaultAsync(category => category.Name == "Thalis");
        if (thalis is null)
        {
            thalis = new Category { Name = "Thalis", KitchenSection = "Indian", SortOrder = 9 };
            db.Categories.Add(thalis);
            await db.SaveChangesAsync();
        }

        var dishes = new[]
        {
            new { Name = "Veg Thali", Description = "A complete vegetarian meal served with roti, rice, and accompaniments.", Price = 249m, VegType = VegType.Veg },
            new { Name = "Chicken Thali", Description = "Chicken curry served with roti, rice, and accompaniments.", Price = 299m, VegType = VegType.NonVeg },
            new { Name = "Mutton Thali", Description = "Mutton curry served with roti, rice, and accompaniments.", Price = 449m, VegType = VegType.NonVeg },
            new { Name = "Surmai Thali", Description = "A rich coastal special with surmai served with rice, roti, and sides.", Price = 489m, VegType = VegType.NonVeg },
            new { Name = "Niyojan SPL Chicken Thali", Description = "Niyojan’s special chicken thali with roti, rice, and accompaniments.", Price = 399m, VegType = VegType.NonVeg },
            new { Name = "Niyojan SPL Mutton Thali", Description = "Niyojan’s special mutton thali with roti, rice, and accompaniments.", Price = 559m, VegType = VegType.NonVeg },
        };

        foreach (var dish in dishes)
        {
            var item = await db.MenuItems.FirstOrDefaultAsync(menuItem =>
                menuItem.CategoryId == thalis.Id &&
                menuItem.Name.ToLower() == dish.Name.ToLower());

            if (item is not null)
            {
                if (dish.Name.Equals("Surmai Thali", StringComparison.OrdinalIgnoreCase) &&
                    item.ImageUrl != "/images/surmai-thali.png")
                    item.ImageUrl = "/images/surmai-thali.png";
                continue;
            }

            db.MenuItems.Add(new MenuItem
            {
                CategoryId = thalis.Id,
                Name = dish.Name,
                Description = dish.Description,
                Price = dish.Price,
                VegType = dish.VegType,
                ImageUrl = dish.Name.Equals("Surmai Thali", StringComparison.OrdinalIgnoreCase)
                    ? "/images/surmai-thali.png"
                    : "/images/niyojan-signature-thali.png",
                TaxPercent = 5,
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedAdditionalMenuItemsAsync(AppDbContext db)
    {
        var drinks = await GetOrCreateCategoryAsync(db, "Drinks", "Bar", 5);
        var roti = await GetOrCreateCategoryAsync(db, "Roti", "Tandoor", 3);
        var maharashtrian = await GetOrCreateCategoryAsync(db, "Maharashtrian", "Indian", 7);
        var mainCourse = await GetOrCreateCategoryAsync(db, "Main Course", "Indian", 2);

        var dishes = new[]
        {
            new { CategoryId = drinks.Id, Name = "Water Bottle", Description = "1 litre bottled drinking water.", Price = 20m },
            new { CategoryId = drinks.Id, Name = "Cold Drink (₹20)", Description = "Cold drink.", Price = 20m },
            new { CategoryId = drinks.Id, Name = "Cold Drink (₹40)", Description = "Cold drink.", Price = 40m },
            new { CategoryId = maharashtrian.Id, Name = "Bhajri Bhakari", Description = "Traditional bhajri flour flatbread.", Price = 35m },
            new { CategoryId = roti.Id, Name = "Jawari Bhakari", Description = "Traditional jawari flour flatbread.", Price = 35m },
            new { CategoryId = roti.Id, Name = "Chapati", Description = "Soft whole-wheat flatbread.", Price = 20m },
            new { CategoryId = mainCourse.Id, Name = "Alani Varan", Description = "Plain, lightly seasoned lentil dal.", Price = 80m },
        };

        foreach (var dish in dishes)
        {
            if (await db.MenuItems.AnyAsync(item =>
                    item.CategoryId == dish.CategoryId && item.Name == dish.Name))
                continue;

            db.MenuItems.Add(new MenuItem
            {
                CategoryId = dish.CategoryId,
                Name = dish.Name,
                Description = dish.Description,
                Price = dish.Price,
                VegType = VegType.Veg,
                TaxPercent = 5,
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task<Category> GetOrCreateCategoryAsync(
        AppDbContext db,
        string name,
        string kitchenSection,
        int sortOrder)
    {
        var category = await db.Categories.FirstOrDefaultAsync(item => item.Name == name);
        if (category is not null)
            return category;

        category = new Category { Name = name, KitchenSection = kitchenSection, SortOrder = sortOrder };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    private static async Task ReactivateNonVegMenuAsync(AppDbContext db)
    {
        var inactiveNonVegItems = await db.MenuItems
            .Where(item => !item.IsActive && item.IsAvailable && item.VegType == VegType.NonVeg)
            .ToListAsync();

        foreach (var item in inactiveNonVegItems)
            item.IsActive = true;

        if (inactiveNonVegItems.Count > 0)
            await db.SaveChangesAsync();
    }

    private static async Task ClearPlaceholderMenuImagesAsync(AppDbContext db)
    {
        var placeholderPhotos = new[]
        {
            "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
        };
        var itemsWithPlaceholderPhotos = await db.MenuItems
            .Where(item => item.ImageUrl != null && placeholderPhotos.Contains(item.ImageUrl))
            .ToListAsync();

        foreach (var item in itemsWithPlaceholderPhotos)
            item.ImageUrl = null;

        if (itemsWithPlaceholderPhotos.Count > 0)
            await db.SaveChangesAsync();
    }
}

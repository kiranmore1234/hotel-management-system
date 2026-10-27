using Bramhand.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Floor> Floors => Set<Floor>();
    public DbSet<RestaurantTable> Tables => Set<RestaurantTable>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Kot> Kots => Set<Kot>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<StaffAttendance> StaffAttendance => Set<StaffAttendance>();
    public DbSet<RestaurantSettings> Settings => Set<RestaurantSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Username).HasMaxLength(50);
            e.Property(x => x.JobTitle).HasMaxLength(50);
        });

        modelBuilder.Entity<Floor>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<RestaurantTable>(e =>
        {
            e.Property(x => x.TableNo).HasMaxLength(20);
            e.HasIndex(x => new { x.FloorId, x.TableNo }).IsUnique();
            e.HasOne(x => x.Floor).WithMany(x => x.Tables).HasForeignKey(x => x.FloorId);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.KitchenSection).HasMaxLength(50);
        });

        modelBuilder.Entity<MenuItem>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.Property(x => x.HalfPrice).HasPrecision(18, 2);
            e.Property(x => x.TaxPercent).HasPrecision(5, 2);
            e.HasOne(x => x.Category).WithMany(x => x.Items).HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.HasIndex(x => x.OrderNumber).IsUnique();
            e.Property(x => x.OrderNumber).HasMaxLength(30);
            e.HasOne(x => x.Table).WithMany(x => x.Orders).HasForeignKey(x => x.TableId);
            e.HasOne(x => x.Captain).WithMany(x => x.Orders).HasForeignKey(x => x.CaptainId);
        });

        modelBuilder.Entity<OrderItem>(e =>
        {
            e.Property(x => x.ItemName).HasMaxLength(150);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.Note).HasMaxLength(250);
            e.HasOne(x => x.Order).WithMany(x => x.Items).HasForeignKey(x => x.OrderId);
            e.HasOne(x => x.MenuItem).WithMany().HasForeignKey(x => x.MenuItemId);
            e.HasOne(x => x.TakenByUser).WithMany().HasForeignKey(x => x.TakenByUserId);
        });

        modelBuilder.Entity<Kot>(e =>
        {
            e.HasOne(x => x.Order).WithMany(x => x.Kots).HasForeignKey(x => x.OrderId);
        });

        modelBuilder.Entity<Bill>(e =>
        {
            e.HasIndex(x => x.BillNumber).IsUnique();
            e.Property(x => x.BillNumber).HasMaxLength(30);
            e.Property(x => x.Subtotal).HasPrecision(18, 2);
            e.Property(x => x.DiscountAmount).HasPrecision(18, 2);
            e.Property(x => x.DiscountPercent).HasPrecision(5, 2);
            e.Property(x => x.ServiceCharge).HasPrecision(18, 2);
            e.Property(x => x.Cgst).HasPrecision(18, 2);
            e.Property(x => x.Sgst).HasPrecision(18, 2);
            e.Property(x => x.RoundOff).HasPrecision(18, 2);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.Property(x => x.PaidAmount).HasPrecision(18, 2);
            e.HasOne(x => x.Order).WithOne(x => x.Bill).HasForeignKey<Bill>(x => x.OrderId);
            e.HasOne(x => x.PrintedByUser).WithMany().HasForeignKey(x => x.PrintedByUserId);
        });

        modelBuilder.Entity<StaffAttendance>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.WorkDate }).IsUnique();
            e.Property(x => x.Status).HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(250);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RecordedByUser).WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RestaurantSettings>(e =>
        {
            e.Property(x => x.RestaurantName).HasMaxLength(150);
            e.Property(x => x.DefaultCgstPercent).HasPrecision(5, 2);
            e.Property(x => x.DefaultSgstPercent).HasPrecision(5, 2);
            e.Property(x => x.ServiceChargePercent).HasPrecision(5, 2);
        });
    }
}

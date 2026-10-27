using Bramhand.Api.Models;

namespace Bramhand.Api.Models.Entities;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? PinHash { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public class Floor
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
}

public class RestaurantTable
{
    public int Id { get; set; }
    public int FloorId { get; set; }
    public string TableNo { get; set; } = string.Empty;
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Vacant;
    public bool IsActive { get; set; } = true;

    public Floor Floor { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? KitchenSection { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}

public class MenuItem
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal HalfPrice { get; set; }
    public decimal TaxPercent { get; set; } = 5;
    public VegType VegType { get; set; } = VegType.Veg;
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool HasHalfFull { get; set; }
    public bool IsActive { get; set; } = true;

    public Category Category { get; set; } = null!;
}

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int TableId { get; set; }
    public int CaptainId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Open;
    public int Guests { get; set; } = 1;
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public int KotCounter { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }

    public RestaurantTable Table { get; set; } = null!;
    public User Captain { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<Kot> Kots { get; set; } = new List<Kot>();
    public Bill? Bill { get; set; }
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int MenuItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Note { get; set; }
    public bool IsHalf { get; set; }
    public OrderItemStatus Status { get; set; } = OrderItemStatus.Pending;
    public int KotNo { get; set; }
    public int? TakenByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Order Order { get; set; } = null!;
    public MenuItem MenuItem { get; set; } = null!;
    public User? TakenByUser { get; set; }
}

public class Kot
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int KotNo { get; set; }
    public string? Section { get; set; }
    public DateTime PrintedAt { get; set; } = DateTime.UtcNow;
    public bool IsPrinted { get; set; } = true;

    public Order Order { get; set; } = null!;
}

public class Bill
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string BillNumber { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal RoundOff { get; set; }
    public decimal Total { get; set; }
    public PaymentMode? PaymentMode { get; set; }
    public decimal PaidAmount { get; set; }
    public int? PrintedByUserId { get; set; }
    public int PrintCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    public Order Order { get; set; } = null!;
    public User? PrintedByUser { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}

public class StaffAttendance
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime WorkDate { get; set; }
    public string Status { get; set; } = "Absent";
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string? Notes { get; set; }
    public int RecordedByUserId { get; set; }

    public User User { get; set; } = null!;
    public User RecordedByUser { get; set; } = null!;
}

public class RestaurantSettings
{
    public int Id { get; set; }
    public string RestaurantName { get; set; } = "Niyojan Resto";
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Gstin { get; set; }
    public string? LogoUrl { get; set; }
    public decimal DefaultCgstPercent { get; set; } = 2.5m;
    public decimal DefaultSgstPercent { get; set; } = 2.5m;
    public decimal ServiceChargePercent { get; set; }
    public string Currency { get; set; } = "INR";
    public string BillPrefix { get; set; } = "NR";
}

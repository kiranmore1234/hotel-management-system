using System.ComponentModel.DataAnnotations;
using Bramhand.Api.Models;

namespace Bramhand.Api.DTOs;

public record LoginRequest(
    [Required] string Username,
    string? Password,
    string? Pin);

public record LoginResponse(
    string Token,
    int UserId,
    string Name,
    string Username,
    string Role,
    DateTime ExpiresAt);

public record UserDto(int Id, string Name, string Username, string? Phone, string Role, bool IsActive);

public record FloorDto(int Id, string Name, int SortOrder, List<TableDto> Tables);

public record TableDto(
    int Id,
    int FloorId,
    string FloorName,
    string TableNo,
    int Capacity,
    string Status,
    int? ActiveOrderId);

public record CategoryDto(int Id, string Name, string? KitchenSection, int SortOrder, List<MenuItemDto> Items);

public record MenuItemDto(
    int Id,
    int CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    decimal Price,
    decimal HalfPrice,
    decimal TaxPercent,
    string VegType,
    string? ImageUrl,
    bool IsAvailable,
    bool HasHalfFull);

public record CreateMenuItemRequest(
    int CategoryId,
    string Name,
    string? Description,
    decimal Price,
    decimal HalfPrice,
    decimal TaxPercent,
    VegType VegType,
    bool HasHalfFull,
    bool IsAvailable);

public record UpdateMenuItemRequest(
    string Name,
    string? Description,
    decimal Price,
    decimal HalfPrice,
    decimal TaxPercent,
    VegType VegType,
    bool HasHalfFull,
    bool IsAvailable);

public record CreateOrderItemRequest(int MenuItemId, int Quantity, string? Note, bool IsHalf);

public record CreateOrderRequest(
    int TableId,
    int Guests,
    string? CustomerName,
    string? CustomerPhone,
    List<CreateOrderItemRequest> Items);

public record AddOrderItemsRequest(List<CreateOrderItemRequest> Items);

public record OrderItemDto(
    int Id,
    int MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    string? Note,
    bool IsHalf,
    string Status,
    int KotNo,
    string? TakenBy,
    DateTime CreatedAt,
    decimal LineTotal);

public record OrderDto(
    int Id,
    string OrderNumber,
    int TableId,
    string TableNo,
    string FloorName,
    int CaptainId,
    string CaptainName,
    string Status,
    int Guests,
    string? CustomerName,
    string? CustomerPhone,
    int KotCounter,
    DateTime CreatedAt,
    List<OrderItemDto> Items,
    decimal Subtotal);

public record CreateBillRequest(
    decimal DiscountAmount,
    decimal DiscountPercent,
    decimal? ServiceChargePercent,
    PaymentMode? PaymentMode,
    decimal? PaidAmount);

public record BillDto(
    int Id,
    int OrderId,
    string BillNumber,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal DiscountPercent,
    decimal ServiceCharge,
    decimal Cgst,
    decimal Sgst,
    decimal RoundOff,
    decimal Total,
    string? PaymentMode,
    decimal PaidAmount,
    int PrintCount,
    DateTime CreatedAt,
    DateTime? PaidAt,
    OrderDto Order);

public record DashboardDto(
    decimal TodaySale,
    int TodayBills,
    int TodayOrders,
    decimal AverageBill,
    int VacantTables,
    int OccupiedTables,
    int BillingTables,
    List<TableDto> RunningTables,
    List<DailySaleDto> DailySales);

public record DailySaleDto(DateTime Date, decimal Total);

public record CreateTableRequest(int FloorId, string TableNo, int Capacity);
public record UpdateTableRequest(string TableNo, int Capacity, bool IsActive);
public record CreateFloorRequest(string Name, int SortOrder);
public record CreateCategoryRequest(string Name, string? KitchenSection, int SortOrder);
public record UpdateTableStatusRequest(TableStatus Status);

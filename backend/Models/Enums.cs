namespace Bramhand.Api.Models;

public enum UserRole
{
    Admin = 1,
    Manager = 2,
    Captain = 3
}

public enum TableStatus
{
    Vacant = 1,
    Occupied = 2,
    Billing = 3,
    Reserved = 4
}

public enum OrderStatus
{
    Open = 1,
    Billing = 2,
    Closed = 3,
    Cancelled = 4
}

public enum OrderItemStatus
{
    Pending = 1,
    Cooking = 2,
    Ready = 3,
    Served = 4,
    Cancelled = 5
}

public enum VegType
{
    Veg = 1,
    NonVeg = 2,
    Egg = 3
}

public enum PaymentMode
{
    Cash = 1,
    Upi = 2,
    Card = 3,
    Part = 4
}

export type TableStatus = "Vacant" | "Occupied" | "Billing" | "Reserved";
export type VegType = "Veg" | "NonVeg" | "Egg";
export type PaymentMode = "Cash" | "Upi" | "Card" | "Part";

export interface TableDto {
  id: number;
  floorId: number;
  floorName: string;
  tableNo: string;
  capacity: number;
  status: TableStatus;
  activeOrderId: number | null;
}

export interface FloorDto {
  id: number;
  name: string;
  sortOrder: number;
  tables: TableDto[];
}

export interface MenuItemDto {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  halfPrice: number;
  taxPercent: number;
  vegType: VegType;
  imageUrl: string | null;
  isAvailable: boolean;
  hasHalfFull: boolean;
}

export interface CategoryDto {
  id: number;
  name: string;
  kitchenSection: string | null;
  sortOrder: number;
  items: MenuItemDto[];
}

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  isHalf: boolean;
}

export interface OrderItemDto {
  id: number;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  isHalf: boolean;
  status: string;
  kotNo: number;
  takenBy: string | null;
  createdAt: string;
  lineTotal: number;
}

export interface OrderDto {
  id: number;
  orderNumber: string;
  tableId: number;
  tableNo: string;
  floorName: string;
  captainId: number;
  captainName: string;
  status: string;
  guests: number;
  customerName: string | null;
  customerPhone: string | null;
  kotCounter: number;
  createdAt: string;
  items: OrderItemDto[];
  subtotal: number;
}

export interface BillDto {
  id: number;
  orderId: number;
  billNumber: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  serviceCharge: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  total: number;
  paymentMode: PaymentMode | null;
  paidAmount: number;
  printCount: number;
  createdAt: string;
  paidAt: string | null;
  order: OrderDto;
}

export interface DashboardDto {
  todaySale: number;
  todayBills: number;
  todayOrders: number;
  averageBill: number;
  vacantTables: number;
  occupiedTables: number;
  billingTables: number;
  runningTables: TableDto[];
  dailySales: { date: string; total: number }[];
}

export interface CreateBillRequest {
  discountAmount: number;
  discountPercent: number;
  serviceChargePercent?: number | null;
  paymentMode: PaymentMode | null;
  paidAmount: number | null;
}

export interface CreateOrderRequest {
  tableId: number;
  guests: number;
  customerName: string | null;
  customerPhone: string | null;
  items: {
    menuItemId: number;
    quantity: number;
    note: string | null;
    isHalf: boolean;
  }[];
}

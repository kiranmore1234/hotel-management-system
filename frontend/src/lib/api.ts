import type {
  BillDto,
  CreateBillRequest,
  CreateOrderRequest,
  DashboardDto,
  OrderDto,
} from "@/types";

const TOKEN_KEY = "bramhand_token";

export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const configuredHost = configured ? new URL(configured).hostname : "";
    if (!configured || configuredHost === "localhost" || configuredHost === "127.0.0.1") {
      return `http://${window.location.hostname}:5080`;
    }
  }
  return configured ?? "http://localhost:5080";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const token = !skipAuth ? getStoredToken() : null;

  const res = await fetch(`${getApiBase()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const dashboardApi = {
  get: () => api<DashboardDto>("/api/dashboard"),
};

export const ordersApi = {
  create: (request: CreateOrderRequest) =>
    api<OrderDto>("/api/orders", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  byId: (orderId: number) => api<OrderDto>(`/api/orders/${orderId}`),
  byTable: (tableId: number) => api<OrderDto>(`/api/orders/table/${tableId}`),
  addItems: (orderId: number, items: CreateOrderRequest["items"]) =>
    api<OrderDto>(`/api/orders/${orderId}/items`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};

export const billsApi = {
  create: (orderId: number, request: CreateBillRequest) =>
    api<BillDto>(`/api/bills/order/${orderId}`, {
      method: "POST",
      body: JSON.stringify(request),
    }),
  pay: (billId: number, request: CreateBillRequest) =>
    api<BillDto>(`/api/bills/${billId}/pay`, {
      method: "POST",
      body: JSON.stringify(request),
    }),
  byOrder: (orderId: number) => api<BillDto>(`/api/bills/order/${orderId}`),
  print: (billId: number) =>
    api<BillDto>(`/api/bills/${billId}/print`, { method: "POST" }),
};

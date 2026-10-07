"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError, ordersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatTime } from "@/lib/format";
import type { OrderDto } from "@/lib/types";

export default function TableOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: tableIdStr } = use(params);
  const tableId = Number(tableIdStr);
  const { isManager } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const data = await ordersApi.byTable(tableId);
      setOrder(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setOrder(null);
        setError("No running order on this table");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load order");
      }
    } finally {
      setFetching(false);
    }
  }, [tableId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/tables")}
            className="mb-1 text-sm font-medium text-amber-700"
          >
            ← Tables
          </button>
          <h1 className="text-2xl font-bold text-stone-900">Running Order</h1>
          {order ? (
            <p className="text-sm text-stone-500">
              {order.orderNumber} · Table {order.tableNo} · {order.floorName} ·{" "}
              {order.captainName}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={order?.status === "Billing"}
            onClick={() => router.push(`/order/new?tableId=${tableId}`)}
            className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add items
          </button>
          {isManager && order ? (
            <button
              type="button"
              onClick={() => router.push(`/billing/${order.id}`)}
              className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white"
            >
              Bill
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {fetching && !order ? (
        <p className="py-12 text-center text-stone-500">Loading order…</p>
      ) : order ? (
        <>
          {order.status === "Billing" ? (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Bill ban chuka hai. Payment settle karne ke baad table vacant ho jayegi.
            </p>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <StatusBadge status={order.status} />
            <span className="text-sm text-stone-600">
              Guests: {order.guests}
              {order.customerName ? ` · ${order.customerName}` : ""}
            </span>
            <span className="ml-auto text-base font-bold text-stone-900">
              {formatCurrency(order.subtotal)}
            </span>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-stone-900">
                      {item.itemName}
                      {item.isHalf ? " (Half)" : ""} × {item.quantity}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span>KOT #{item.kotNo}</span>
                      <span>{formatTime(item.createdAt)}</span>
                      {item.takenBy ? <span>by {item.takenBy}</span> : null}
                      {item.note ? <span>Note: {item.note}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-sm font-semibold">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200">
          <p className="mb-4 text-stone-600">No running order. Start a new one?</p>
          <button
            type="button"
            onClick={() => router.push(`/order/new?tableId=${tableId}`)}
            className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950"
          >
            Start order
          </button>
        </div>
      )}
    </div>
  );
}

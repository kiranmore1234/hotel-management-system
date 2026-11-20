"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, ordersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type SalesReportOrderItem = {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
  status: string;
};

type SalesReportOrder = {
  id: number;
  orderNumber: string;
  tableNo: string;
  captainName: string;
  createdAt: string;
  status: string;
  billNumber: string | null;
  billTotal: number | null;
  paidAmount: number | null;
  paidAt: string | null;
  items: SalesReportOrderItem[];
};

type SalesReport = {
  from: string;
  to: string;
  totalSales: number;
  billCount: number;
  salesByPaymentMode: Record<string, number>;
  bills: {
    billNumber: string;
    total: number;
    paymentMode: string | null;
    paidAt: string;
    orderNumber: string;
    tableNo: string;
    captainName: string;
  }[];
  orders?: SalesReportOrder[];
};

type LoadedSalesReport = Omit<SalesReport, "orders"> & { orders: SalesReportOrder[] };

type ItemDraft = { quantity: number; note: string };

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

function reportDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReportsPage() {
  const today = localDateValue(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<LoadedSalesReport | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ItemDraft>>({});
  const [loading, setLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadReport(fromDate = from, toDate = to) {
    setLoading(true);
    setError("");
    try {
      const result = await api<SalesReport>(`/api/reports/sales?from=${fromDate}&to=${toDate}`);
      setReport({ ...result, orders: result.orders ?? [] });
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sales report could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from > to) {
      setError("From date must be on or before the To date.");
      return;
    }
    await loadReport();
  }

  async function saveItem(orderId: number, item: SalesReportOrderItem) {
    const draft = drafts[item.id];
    if (!draft || draft.quantity < 1) {
      setError("Quantity should be at least 1.");
      return;
    }
    setBusyItemId(item.id);
    setError("");
    try {
      await ordersApi.updateItem(orderId, item.id, draft.quantity, draft.note);
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order item could not be updated");
    } finally {
      setBusyItemId(null);
    }
  }

  async function cancelItem(order: SalesReportOrder, item: SalesReportOrderItem) {
    if (!window.confirm(`Cancel ${item.itemName} from ${order.orderNumber}? The saved bill will be recalculated.`)) return;
    setBusyItemId(item.id);
    setError("");
    try {
      await ordersApi.cancelItem(order.id, item.id);
      await loadReport();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Order item could not be cancelled");
    } finally {
      setBusyItemId(null);
    }
  }

  function setPreset(days: number) {
    const end = localDateValue(new Date());
    const start = dateOffset(-(days - 1));
    setFrom(start);
    setTo(end);
    void loadReport(start, end);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936b3f]">Business performance</p>
        <h1 className="text-3xl font-semibold text-[#26342c]">Sales reports</h1>
        <p className="text-sm text-stone-500">See orders by the date they were placed, with table, items, and settled sales.</p>
      </div>

      <form onSubmit={(event) => void submitReport(event)} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-stone-600">From<input type="date" required value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3" /></label>
          <label className="text-sm font-medium text-stone-600">To<input type="date" required value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3" /></label>
          <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#18352c] px-5 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? <SpinnerIcon /> : <CalendarIcon />}
            {loading ? "Loading…" : "Show report"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick date ranges">
          <QuickRangeButton onClick={() => setPreset(1)}>Today</QuickRangeButton>
          <QuickRangeButton onClick={() => setPreset(7)}>Last 7 days</QuickRangeButton>
          <QuickRangeButton onClick={() => setPreset(30)}>Last 30 days</QuickRangeButton>
        </div>
      </form>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {report ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Summary label="Settled sales" value={formatCurrency(report.totalSales)} />
            <Summary label="Bills settled" value={String(report.billCount)} />
            <Summary label="Orders placed" value={String(report.orders.length)} />
            {Object.entries(report.salesByPaymentMode).map(([mode, amount]) => <Summary key={mode} label={`${mode} collections`} value={formatCurrency(amount)} />)}
          </div>

          <section className="mt-6" aria-labelledby="orders-report-title">
            <div className="mb-3">
              <h2 id="orders-report-title" className="text-lg font-semibold text-stone-900">Orders by date placed</h2>
              <p className="text-xs text-stone-500">{report.from} to {report.to} · table, order items, quantity and amount</p>
            </div>
            {report.orders.length === 0 ? <p className="rounded-2xl bg-white p-5 text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">No orders were placed in this date range.</p> : (
              <div className="space-y-4">
                {report.orders.map((order) => (
                  <article key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
                      <div>
                        <h3 className="font-semibold text-stone-900">{order.orderNumber} · Table {order.tableNo}</h3>
                        <p className="mt-1 text-xs text-stone-500">{reportDateTime(order.createdAt)} · Captain: {order.captainName}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-stone-800">{order.status}{order.billNumber ? ` · ${order.billNumber}` : ""}</p>
                        {order.billTotal !== null ? <p className="text-xs text-stone-500">Bill {formatCurrency(order.billTotal)} · Paid {formatCurrency(order.paidAmount ?? 0)}</p> : <p className="text-xs text-stone-500">No bill generated</p>}
                      </div>
                    </div>
                    {order.items.length === 0 ? <p className="px-5 py-4 text-sm text-stone-500">No items in this order.</p> : (
                      <div className="divide-y divide-stone-100">
                        {order.items.map((item) => {
                          const draft = drafts[item.id];
                          const editing = draft !== undefined;
                          const cancelled = item.status === "Cancelled";
                          const busy = busyItemId === item.id;
                          return (
                            <div key={item.id} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 ${cancelled ? "bg-stone-50 opacity-70" : ""}`}>
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium text-stone-800 ${cancelled ? "line-through" : ""}`}>{item.itemName}</p>
                                <p className="mt-1 text-xs text-stone-500">{formatCurrency(item.unitPrice)} each · {item.status}{item.note ? ` · ${item.note}` : ""}</p>
                              </div>
                              {editing ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="sr-only" htmlFor={`quantity-${item.id}`}>Quantity for {item.itemName}</label>
                                  <input id={`quantity-${item.id}`} type="number" min={1} value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, quantity: Number(event.target.value) } }))} className="min-h-10 w-20 rounded-lg border border-stone-300 px-2 text-sm" />
                                  <label className="sr-only" htmlFor={`note-${item.id}`}>Note for {item.itemName}</label>
                                  <input id={`note-${item.id}`} value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, note: event.target.value } }))} placeholder="Item note" className="min-h-10 w-36 rounded-lg border border-stone-300 px-2 text-sm" />
                                  <IconButton title="Save changes" label={`Save ${item.itemName}`} disabled={busy} onClick={() => void saveItem(order.id, item)}><SaveIcon /></IconButton>
                                  <IconButton title="Discard changes" label={`Discard changes to ${item.itemName}`} disabled={busy} onClick={() => setDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; })}><CloseIcon /></IconButton>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="mr-1 text-sm font-semibold text-stone-800">Qty {item.quantity} · {formatCurrency(item.quantity * item.unitPrice)}</p>
                                  {!cancelled ? (
                                    <>
                                      <IconButton title="Edit item" label={`Edit ${item.itemName}`} disabled={busyItemId !== null} onClick={() => setDrafts((current) => ({ ...current, [item.id]: { quantity: item.quantity, note: item.note ?? "" } }))}><EditIcon /></IconButton>
                                      <IconButton title="Cancel item" label={`Cancel ${item.itemName}`} disabled={busy} danger onClick={() => void cancelItem(order, item)}><DeleteIcon /></IconButton>
                                    </>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
            <div className="border-b border-stone-100 px-4 py-4 sm:px-5">
              <h2 className="font-semibold text-stone-900">Settled bills</h2>
              <p className="text-xs text-stone-500">Filtered by payment date · {report.from} to {report.to}</p>
            </div>
            {report.bills.length === 0 ? <p className="p-5 text-sm text-stone-500">No bills were settled in this date range.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr><th className="px-4 py-3 font-semibold">Bill / time</th><th className="px-4 py-3 font-semibold">Order / table</th><th className="px-4 py-3 font-semibold">Captain</th><th className="px-4 py-3 font-semibold">Payment</th><th className="px-4 py-3 text-right font-semibold">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.bills.map((bill) => (
                      <tr key={bill.billNumber}>
                        <td className="px-4 py-3"><span className="font-semibold text-stone-900">{bill.billNumber}</span><span className="block text-xs text-stone-500">{reportDateTime(bill.paidAt)}</span></td>
                        <td className="px-4 py-3">{bill.orderNumber}<span className="block text-xs text-stone-500">Table {bill.tableNo}</span></td>
                        <td className="px-4 py-3">{bill.captainName}</td>
                        <td className="px-4 py-3">{bill.paymentMode ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(bill.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : <p className="mt-5 text-sm text-stone-500">Select a date range and show the report.</p>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-900">{value}</p></div>;
}

function QuickRangeButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-9 rounded-lg bg-stone-100 px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-200">{children}</button>;
}

function IconButton({ children, title, label, disabled, danger = false, onClick }: { children: ReactNode; title: string; label: string; disabled: boolean; danger?: boolean; onClick: () => void }) {
  return <button type="button" title={title} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex size-10 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"}`}>{children}</button>;
}

function CalendarIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
}

function SpinnerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 animate-spin" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" strokeOpacity=".3" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>;
}

function EditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" /></svg>;
}

function SaveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h12l4 4v14H3V3z" /><path d="M7 3v6h10V3M7 21v-8h10v8" /></svg>;
}

function DeleteIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, billsApi, ordersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import type { BillDto, OrderDto, PaymentMode } from "@/lib/types";

export default function BillingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId: orderIdStr } = use(params);
  const orderId = Number(orderIdStr);
  const { isManager, loading: authLoading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [bill, setBill] = useState<BillDto | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const o = await ordersApi.byId(orderId);
      setOrder(o);
      try {
        setBill(await billsApi.byOrder(orderId));
      } catch (billError) {
        if (billError instanceof ApiError && billError.status === 404) {
          setBill(null);
        } else {
          throw billError;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isManager) {
      router.replace("/tables");
      return;
    }
    if (!Number.isFinite(orderId)) return;
    void load();
  }, [authLoading, isManager, router, load, orderId]);

  const preview = useMemo(() => {
    if (!order) return null;
    const active = order.items.filter((i) => i.status !== "Cancelled");
    const subtotal = active.reduce((s, i) => s + i.lineTotal, 0);
    let discount = discountAmount;
    if (discountPercent > 0) {
      discount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
    }
    const after = Math.max(0, subtotal - discount);
    const cgst = Math.round(after * 0.025 * 100) / 100;
    const sgst = Math.round(after * 0.025 * 100) / 100;
    const raw = after + cgst + sgst;
    const total = Math.round(raw);
    return { subtotal, discount, cgst, sgst, roundOff: total - raw, total };
  }, [order, discountAmount, discountPercent]);

  async function createBill(andPay: boolean) {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      let current = bill;
      if (!current) {
        current = await billsApi.create(order.id, {
          discountAmount,
          discountPercent,
          serviceChargePercent: null,
          paymentMode: andPay ? paymentMode : null,
          paidAmount: andPay ? null : 0,
        });
        setBill(current);
      }

      if (andPay && (!current.paidAt || current.paidAmount < current.total)) {
        current = await billsApi.pay(current.id, {
          discountAmount: current.discountAmount,
          discountPercent: current.discountPercent,
          paymentMode,
          paidAmount: current.total,
        });
        setBill(current);
      }

    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(bill?.paidAt ? "Bill is already settled" : "Bill already exists for this order");
      } else {
        setError(err instanceof Error ? err.message : "Billing failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function printBill() {
    if (!bill) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      setError("Print window blocked. Browser mein pop-ups allow karein.");
      return;
    }
    setActionBusy(true);
    setError("");
    try {
      const printedBill = await billsApi.print(bill.id);
      setBill(printedBill);
      printWindow.document.open();
      printWindow.document.write(buildBillHtml(printedBill, true));
      printWindow.document.close();
      printWindow.focus();
    } catch (err) {
      printWindow.close();
      setError(err instanceof Error ? err.message : "Print nahi ho saka");
    } finally {
      setActionBusy(false);
    }
  }

  function shareOnWhatsApp() {
    if (!bill) return;
    const lines = [
      `Bramhand Restaurant — Bill ${bill.billNumber}`,
      `Table: ${bill.order.tableNo} | Order: ${bill.order.orderNumber}`,
      ...bill.order.items
        .filter((item) => item.status !== "Cancelled")
        .map((item) => `${item.quantity} x ${item.itemName}: ${formatCurrency(item.lineTotal)}`),
      `Subtotal: ${formatCurrency(bill.subtotal)}`,
      `Discount: ${formatCurrency(bill.discountAmount)}`,
      `CGST: ${formatCurrency(bill.cgst)} | SGST: ${formatCurrency(bill.sgst)}`,
      `Total: ${formatCurrency(bill.total)}`,
      bill.paidAt ? `Payment: ${bill.paymentMode ?? "Paid"}` : "Payment pending",
    ];
    const phoneDigits = bill.order.customerPhone?.replace(/\D/g, "");
    const phone = phoneDigits?.length === 10 ? `91${phoneDigits}` : phoneDigits;
    const recipient = phone ? `/${phone}` : "/";
    window.open(`https://wa.me${recipient}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  function downloadBill() {
    if (!bill) return;
    const url = URL.createObjectURL(new Blob([buildBillHtml(bill)], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bill.billNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!isManager) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-2 text-sm font-medium text-amber-700"
      >
        ← Back
      </button>
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Billing</h1>

      {error ? (
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading || !order ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-lg font-bold">
              {order.orderNumber} · Table {order.tableNo}
            </h2>
            <p className="text-sm text-stone-500">
              {order.floorName}
              {order.customerName ? ` · ${order.customerName}` : ""}
            </p>
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {order.items
                .filter((i) => i.status !== "Cancelled")
                .map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 text-sm">
                    <span>
                      {item.quantity}× {item.itemName}
                      {item.isHalf ? " (H)" : ""}
                    </span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            {bill?.paidAt ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <p className="font-bold">Payment settled · {bill.billNumber}</p>
                <p className="mt-1 text-2xl">{formatCurrency(bill.total)}</p>
                <p className="text-sm">via {bill.paymentMode === "Upi" ? "UPI / Online" : bill.paymentMode}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button type="button" disabled={actionBusy} onClick={() => void printBill()} className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 disabled:opacity-50">Print bill</button>
                  <button type="button" onClick={shareOnWhatsApp} className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">WhatsApp bill</button>
                  <button type="button" onClick={downloadBill} className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">Download bill</button>
                </div>
                <Link
                  href="/tables"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white"
                >
                  Back to tables
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Discount ₹
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      disabled={!!bill}
                      onChange={(e) =>
                        setDiscountAmount(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="min-h-11 w-full rounded-xl border border-stone-300 px-3"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      disabled={!!bill}
                      onChange={(e) =>
                        setDiscountPercent(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="min-h-11 w-full rounded-xl border border-stone-300 px-3"
                    />
                  </div>
                </div>

                <div className="mt-4">
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Payment mode (settle received payment)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Cash", "Upi", "Card"] as PaymentMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`min-h-11 rounded-xl text-sm font-semibold ${
                          paymentMode === mode
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {mode === "Upi" ? "UPI" : mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-1 rounded-xl bg-stone-50 p-3 text-sm">
                  {bill ? (
                    <>
                      <Row label="Subtotal" value={bill.subtotal} />
                      <Row label="Discount" value={-bill.discountAmount} />
                      <Row label="Service" value={bill.serviceCharge} />
                      <Row label="CGST" value={bill.cgst} />
                      <Row label="SGST" value={bill.sgst} />
                      <Row label="Round off" value={bill.roundOff} />
                      <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
                        <span>Total</span>
                        <span className="text-amber-700">{formatCurrency(bill.total)}</span>
                      </div>
                    </>
                  ) : preview ? (
                    <>
                      <Row label="Subtotal" value={preview.subtotal} />
                      <Row label="Discount" value={-preview.discount} />
                      <Row label="CGST (est.)" value={preview.cgst} />
                      <Row label="SGST (est.)" value={preview.sgst} />
                      <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
                        <span>Est. total</span>
                        <span className="text-amber-700">
                          {formatCurrency(preview.total)}
                        </span>
                      </div>
                      <p className="pt-1 text-[11px] text-stone-400">
                        Final tax/service applied by server on create.
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {!bill ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void createBill(false)}
                      className="min-h-12 rounded-xl border-2 border-stone-900 font-semibold text-stone-900 disabled:opacity-50"
                    >
                      Create Bill
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void createBill(true)}
                    className="min-h-12 rounded-xl bg-amber-500 font-bold text-stone-950 disabled:opacity-50"
                  >
                    {bill
                      ? `Mark payment settled · ${paymentMode === "Upi" ? "UPI / Online" : paymentMode}`
                      : `Create bill & settle · ${paymentMode === "Upi" ? "UPI / Online" : paymentMode}`}
                  </button>
                </div>
                {bill ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button type="button" disabled={actionBusy} onClick={() => void printBill()} className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50">Print bill</button>
                    <button type="button" onClick={shareOnWhatsApp} className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700">WhatsApp bill</button>
                    <button type="button" onClick={downloadBill} className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700">Download bill</button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function buildBillHtml(bill: BillDto, autoPrint = false) {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char] ?? char);
  const rows = bill.order.items
    .filter((item) => item.status !== "Cancelled")
    .map((item) => `<tr><td>${escapeHtml(item.itemName)}${item.isHalf ? " (Half)" : ""}</td><td>${item.quantity}</td><td>${escapeHtml(formatCurrency(item.lineTotal))}</td></tr>`)
    .join("");
  const autoPrintScript = autoPrint ? "<script>window.onload=()=>window.print()</script>" : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${escapeHtml(bill.billNumber)}</title><style>body{font:15px Arial,sans-serif;max-width:720px;margin:40px auto;color:#222}h1{margin-bottom:4px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;border-bottom:1px solid #ddd;padding:10px 6px}th:last-child,td:last-child{text-align:right}.total{font-size:20px;font-weight:bold;border-top:2px solid #222;padding-top:12px;text-align:right}@media print{body{margin:0}}</style></head><body><h1>Bramhand Restaurant</h1><p class="muted">Bill ${escapeHtml(bill.billNumber)} · ${new Date(bill.createdAt).toLocaleString()}</p><p>Order ${escapeHtml(bill.order.orderNumber)} · Table ${escapeHtml(bill.order.tableNo)} · ${escapeHtml(bill.order.floorName)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: ${escapeHtml(formatCurrency(bill.subtotal))}</p><p>Discount: ${escapeHtml(formatCurrency(bill.discountAmount))}</p><p>Service charge: ${escapeHtml(formatCurrency(bill.serviceCharge))}</p><p>CGST: ${escapeHtml(formatCurrency(bill.cgst))} · SGST: ${escapeHtml(formatCurrency(bill.sgst))}</p><p>Round off: ${escapeHtml(formatCurrency(bill.roundOff))}</p><p class="total">Total: ${escapeHtml(formatCurrency(bill.total))}</p><p class="muted">${bill.paidAt ? `Payment settled via ${escapeHtml(bill.paymentMode ?? "")}` : "Payment pending"}</p>${autoPrintScript}</body></html>`;
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-stone-700">
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

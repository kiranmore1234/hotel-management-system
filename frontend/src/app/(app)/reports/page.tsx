"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

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
};

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const today = localDateValue(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReport(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<SalesReport>(`/api/reports/sales?from=${from}&to=${to}`);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sales report could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936b3f]">Business performance</p>
        <h1 className="text-3xl font-semibold text-[#26342c]">Sales reports</h1>
        <p className="text-sm text-stone-500">View settled bills, payment totals, and sales for any date range.</p>
      </div>

      <form onSubmit={(event) => void loadReport(event)} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <label className="text-sm font-medium text-stone-600">From<input type="date" required value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3" /></label>
        <label className="text-sm font-medium text-stone-600">To<input type="date" required value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-stone-300 bg-white px-3" /></label>
        <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-[#18352c] px-5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Loading…" : "Show report"}</button>
      </form>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {report ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Summary label="Settled sales" value={formatCurrency(report.totalSales)} />
            <Summary label="Bills settled" value={String(report.billCount)} />
            {Object.entries(report.salesByPaymentMode).map(([mode, amount]) => <Summary key={mode} label={`${mode} collections`} value={formatCurrency(amount)} />)}
          </div>
          <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
            <div className="border-b border-stone-100 px-4 py-4 sm:px-5">
              <h2 className="font-semibold text-stone-900">Settled bills</h2>
              <p className="text-xs text-stone-500">{report.from} to {report.to}</p>
            </div>
            {report.bills.length === 0 ? <p className="p-5 text-sm text-stone-500">No settled bills in this date range.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr><th className="px-4 py-3 font-semibold">Bill / time</th><th className="px-4 py-3 font-semibold">Order / table</th><th className="px-4 py-3 font-semibold">Captain</th><th className="px-4 py-3 font-semibold">Payment</th><th className="px-4 py-3 text-right font-semibold">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.bills.map((bill) => (
                      <tr key={bill.billNumber}>
                        <td className="px-4 py-3"><span className="font-semibold text-stone-900">{bill.billNumber}</span><span className="block text-xs text-stone-500">{new Date(bill.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></td>
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

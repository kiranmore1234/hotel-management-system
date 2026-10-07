"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import type { DashboardDto } from "@/lib/types";

export default function DashboardPage() {
  const { isManager, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const dto = await dashboardApi.get();
      setData(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isManager) {
      router.replace("/tables");
      return;
    }
    void load();
  }, [authLoading, isManager, router, load]);

  if (!isManager) return null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936b3f]">Restaurant overview</p>
          <h1 className="text-3xl font-semibold text-[#26342c]">Good service starts here</h1>
          <p className="text-sm text-stone-500">Today&apos;s service, sales, and table activity.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tables" className="inline-flex min-h-11 items-center rounded-xl bg-[#18352c] px-4 text-sm font-semibold text-white transition hover:bg-[#294d40]">Open tables</Link>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold shadow-sm ring-1 ring-[#e8e3d8] transition hover:bg-[#f5f1e8]">Refresh</button>
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading || !data ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Today sale" value={formatCurrency(data.todaySale)} accent />
            <Stat label="Bills" value={String(data.todayBills)} />
            <Stat label="Orders" value={String(data.todayOrders)} />
            <Stat label="Avg bill" value={formatCurrency(data.averageBill)} />
            <Stat label="Vacant" value={String(data.vacantTables)} />
            <Stat label="Occupied" value={String(data.occupiedTables)} />
            <Stat label="Billing" value={String(data.billingTables)} />
          </div>

          <section className="mt-8 rounded-3xl border border-[#e8e3d8] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="sales-chart-title">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sales-chart-title" className="text-lg font-bold text-stone-900">Sales</h2>
                <p className="text-sm text-stone-500">Paid bills · last 7 days</p>
              </div>
              <span className="text-sm font-semibold text-stone-700">Today {formatCurrency(data.todaySale)}</span>
            </div>
            <SalesChart data={data.dailySales ?? []} />
          </section>

          <h2 className="mt-8 mb-3 text-lg font-bold text-stone-900">Running tables</h2>
          {data.runningTables.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
              No occupied tables right now.
            </p>
          ) : (
            <div className="space-y-2">
              {data.runningTables.map((t) => (
                <Link
                  key={t.id}
                  href={`/orders/${t.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
                >
                  <span className="text-xl font-bold">{t.tableNo}</span>
                  <span className="text-sm text-stone-500">{t.floorName}</span>
                  <span className="ml-auto">
                    <StatusBadge status={t.status} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SalesChart({ data }: { data: DashboardDto["dailySales"] }) {
  const maxSale = Math.max(0, ...data.map((day) => day.total));
  const compactCurrency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div role="img" aria-label="Paid sales by day for the last seven days" className="mt-5 grid grid-cols-7 gap-2 sm:gap-4">
      {data.map((day) => {
        const date = new Date(day.date);
        const barHeight = maxSale === 0 ? 0 : Math.max((day.total / maxSale) * 100, day.total > 0 ? 4 : 0);
        return (
          <div key={day.date} title={`${date.toLocaleDateString("en-IN", { dateStyle: "medium" })}: ${formatCurrency(day.total)}`} className="flex min-w-0 flex-col items-center">
            <span className="mb-2 truncate text-[10px] font-medium text-stone-600 sm:text-xs">{compactCurrency.format(day.total)}</span>
            <div className="flex h-32 w-full items-end justify-center border-b border-stone-300 sm:h-40">
              <div className="w-full max-w-12 rounded-t-md bg-[#bd8b4d] transition-[height]" style={{ height: `${barHeight}%` }} />
            </div>
            <span className="mt-2 text-[10px] font-semibold text-stone-700 sm:text-xs">{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
            <span className="text-[10px] text-stone-500">{date.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`lift-card rounded-2xl p-4 shadow-sm ${
        accent
          ? "bg-gradient-to-br from-[#d8b981] to-[#b98449] text-[#26342c]"
          : "bg-white text-stone-900 ring-1 ring-[#e8e3d8]"
      }`}
    >
      <div className={`text-xs font-medium ${accent ? "text-stone-800/80" : "text-stone-500"}`}>
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

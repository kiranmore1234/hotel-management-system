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
    return dashboardApi.get();
  }, []);

  const refresh = useCallback(() => {
    setError("");
    void load()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (authLoading) return;
    if (!isManager) {
      router.replace("/tables");
      return;
    }
    let active = true;
    void load()
      .then((dto) => {
        if (!active) return;
        setData(dto);
        setError("");
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
          <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold shadow-sm ring-1 ring-[#e8e3d8] transition hover:bg-[#f5f1e8]">Refresh</button>
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
  const chartWidth = 760;
  const chartHeight = 250;
  const left = 66;
  const right = 18;
  const top = 18;
  const bottom = 34;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const maxSale = Math.max(0, ...data.map((day) => day.total));
  const scaleMax = maxSale > 0 ? maxSale * 1.2 : 1;
  const points = data.map((day, index) => ({
    ...day,
    x: data.length < 2 ? left + plotWidth / 2 : left + (index / (data.length - 1)) * plotWidth,
    y: top + plotHeight - (Math.max(0, day.total) / scaleMax) * plotHeight,
  }));
  const compactCurrency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = scaleMax * (1 - index / 4);
    return {
      value,
      y: top + (index / 4) * plotHeight,
    };
  });
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const change = previousPoint && lastPoint && previousPoint.total > 0
    ? ((lastPoint.total - previousPoint.total) / previousPoint.total) * 100
    : null;
  const trendColor = !previousPoint || !lastPoint || lastPoint.total >= previousPoint.total ? "#16865b" : "#d94b4b";
  const areaPath = points.length > 0
    ? `M ${firstPoint.x} ${top + plotHeight} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${lastPoint.x} ${top + plotHeight} Z`
    : "";

  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-stone-500">Daily movement · settled sales</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 font-semibold tabular-nums" style={{ color: trendColor }}>
          <span aria-hidden="true">{!previousPoint || !lastPoint ? "•" : lastPoint.total >= previousPoint.total ? "▲" : "▼"}</span>
          {change === null
            ? previousPoint && lastPoint && previousPoint.total === 0 && lastPoint.total > 0 ? "New sales" : "No previous sales"
            : `${Math.abs(change).toFixed(1)}% vs yesterday`}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-500">No sales data available yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="Trading-style line chart showing daily paid sales over the last seven days"
          className="block h-auto w-full overflow-visible"
        >
          <defs>
            <linearGradient id="sales-chart-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#16865b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#16865b" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {gridLines.map((line) => (
            <g key={line.y}>
              <line x1={left} x2={chartWidth - right} y1={line.y} y2={line.y} stroke="#eceeea" strokeDasharray="3 6" />
              <text x={left - 10} y={line.y + 4} textAnchor="end" fill="#89918b" fontSize="11">
                {compactCurrency.format(line.value)}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#sales-chart-area)" />
          {points.slice(1).map((point, index) => {
            const previous = points[index];
            const rising = point.total >= previous.total;
            return (
              <line
                key={`${previous.date}-${point.date}`}
                x1={previous.x}
                y1={previous.y}
                x2={point.x}
                y2={point.y}
                stroke={rising ? "#16865b" : "#d94b4b"}
                strokeLinecap="round"
                strokeWidth="3"
              />
            );
          })}
          {points.map((point, index) => {
            const date = new Date(point.date);
            const color = index === 0 || point.total >= points[index - 1].total ? "#16865b" : "#d94b4b";
            const isLatest = index === points.length - 1;
            return (
              <g key={point.date}>
                <title>{`${date.toLocaleDateString("en-IN", { dateStyle: "medium" })}: ${formatCurrency(point.total)}`}</title>
                {isLatest ? <circle cx={point.x} cy={point.y} r="11" fill={color} fillOpacity="0.14" /> : null}
                <circle cx={point.x} cy={point.y} r={isLatest ? 5 : 4} fill="white" stroke={color} strokeWidth="2.5" />
                <text x={point.x} y={chartHeight - 12} textAnchor="middle" fill="#606962" fontSize="11" fontWeight={isLatest ? "700" : "500"}>
                  {date.toLocaleDateString("en-IN", { weekday: "short" })}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-1 flex items-center justify-end gap-4 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#16865b]" />Up</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d94b4b]" />Down</span>
      </div>
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

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

          <section className="mt-8 overflow-hidden rounded-3xl border border-[#163d3b] bg-[#071b1d] p-5 text-white shadow-sm sm:p-7" aria-labelledby="sales-chart-title">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sales-chart-title" className="text-lg font-bold text-white">Sales growth</h2>
                <p className="text-sm text-emerald-100/60">Paid bills · last 7 days</p>
              </div>
              <span className="text-sm font-semibold text-emerald-100">Today {formatCurrency(data.todaySale)}</span>
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
  const chartHeight = 300;
  const left = 54;
  const right = 20;
  const top = 24;
  const bottom = 40;
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
  const lastPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const change = previousPoint && lastPoint && previousPoint.total > 0
    ? ((lastPoint.total - previousPoint.total) / previousPoint.total) * 100
    : null;
  const baseline = top + plotHeight;
  const areaPath = points.length > 0
    ? `M ${points[0].x} ${baseline} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${lastPoint.x} ${baseline} Z`
    : "";

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200/10 bg-[#092326] p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-emerald-50/60">Daily revenue · settled sales</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/10 bg-emerald-300/5 px-2.5 py-1 font-semibold text-emerald-200 tabular-nums">
          <span aria-hidden="true">{!previousPoint || !lastPoint || lastPoint.total >= previousPoint.total ? "▲" : "▼"}</span>
          {change === null
            ? previousPoint && lastPoint && previousPoint.total === 0 && lastPoint.total > 0 ? "New sales" : "No previous sales"
            : `${Math.abs(change).toFixed(1)}% vs yesterday`}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-emerald-50/60">No sales data available yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="Dark teal sales chart showing daily revenue bars and trend over the last seven days"
          className="block h-auto w-full"
        >
          <defs>
            <linearGradient id="sales-chart-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#52f2c2" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#52f2c2" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="sales-chart-bars" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#64f5d0" stopOpacity="0.78" />
              <stop offset="100%" stopColor="#16a88a" stopOpacity="0.12" />
            </linearGradient>
            <filter id="sales-chart-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="sales-chart-texture" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#8fffe1" strokeOpacity="0.035" strokeWidth="1" />
            </pattern>
          </defs>
          {gridLines.map((line) => (
            <g key={line.y}>
              <line x1={left} x2={chartWidth - right} y1={line.y} y2={line.y} stroke="#b3f5e4" strokeOpacity="0.12" strokeDasharray="4 8" />
              <text x={left - 10} y={line.y + 4} textAnchor="end" fill="#a3c6bd" fillOpacity="0.75" fontSize="11">
                {compactCurrency.format(line.value)}
              </text>
            </g>
          ))}
          <rect x={left} y={top} width={plotWidth} height={plotHeight} fill="url(#sales-chart-texture)" />
          {points.map((point, index) => {
            const barWidth = Math.min(28, plotWidth / Math.max(points.length * 2, 1));
            const height = Math.max(0, baseline - point.y);
            return (
              <rect
                key={`bar-${point.date}`}
                x={point.x - barWidth / 2}
                y={baseline - height}
                width={barWidth}
                height={height}
                rx="5"
                fill="url(#sales-chart-bars)"
                opacity={index === points.length - 1 ? 0.9 : 0.48}
              />
            );
          })}
          <path d={areaPath} fill="url(#sales-chart-area)" />
          {points.length > 1 ? (
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#55f2c4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              filter="url(#sales-chart-glow)"
            />
          ) : null}
          {points.map((point, index) => {
            const date = new Date(point.date);
            const isLatest = index === points.length - 1;
            return (
              <g key={point.date}>
                <title>{`${date.toLocaleDateString("en-IN", { dateStyle: "medium" })}: ${formatCurrency(point.total)}`}</title>
                {isLatest ? <circle cx={point.x} cy={point.y} r="12" fill="#55f2c4" fillOpacity="0.14" /> : null}
                <circle cx={point.x} cy={point.y} r={isLatest ? 5 : 3.5} fill="#092326" stroke="#8dffe1" strokeWidth="2.5" />
                <text x={point.x} y={chartHeight - 12} textAnchor="middle" fill="#c1d9d3" fontSize="11" fontWeight={isLatest ? "700" : "500"}>
                  {date.toLocaleDateString("en-IN", { weekday: "short" })}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-1 flex items-center justify-end gap-4 text-[11px] text-emerald-50/60">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#55f2c4]" />Revenue trend</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#16a88a]" />Daily sales</span>
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TableCard } from "@/components/TableCard";
import { api } from "@/lib/api";
import type { FloorDto, TableDto, TableStatus } from "@/lib/types";

const LEGEND: { status: TableStatus; color: string; label: string }[] = [
  { status: "Vacant", color: "bg-emerald-500", label: "Vacant" },
  { status: "Occupied", color: "bg-rose-500", label: "Occupied" },
  { status: "Billing", color: "bg-amber-400", label: "Billing" },
  { status: "Reserved", color: "bg-sky-500", label: "Reserved" },
];

export default function TablesPage() {
  const router = useRouter();
  const [floors, setFloors] = useState<FloorDto[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const data = await api<FloorDto[]>("/api/tables");
      setFloors(data);
      setActiveFloorId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  const tables = useMemo(() => {
    const floor = floors.find((f) => f.id === activeFloorId);
    return floor?.tables ?? [];
  }, [floors, activeFloorId]);

  const counts = useMemo(() => {
    const all = floors.flatMap((f) => f.tables);
    return {
      Vacant: all.filter((t) => t.status === "Vacant").length,
      Occupied: all.filter((t) => t.status === "Occupied").length,
      Billing: all.filter((t) => t.status === "Billing").length,
      Reserved: all.filter((t) => t.status === "Reserved").length,
    };
  }, [floors]);

  function onTableTap(table: TableDto) {
    if (table.status === "Vacant") {
      router.push(`/order/new?tableId=${table.id}`);
      return;
    }
    if (table.status === "Reserved") return;
    router.push(`/orders/${table.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tables</h1>
          <p className="text-sm text-stone-500">Tap vacant to order · occupied to view</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {LEGEND.map((item) => (
          <span
            key={item.status}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm ring-1 ring-stone-200"
          >
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
            <span className="text-stone-400">({counts[item.status]})</span>
          </span>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {floors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            onClick={() => setActiveFloorId(floor.id)}
            className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
              activeFloorId === floor.id
                ? "bg-amber-500 text-stone-950 shadow"
                : "bg-white text-stone-700 ring-1 ring-stone-200"
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {fetching && floors.length === 0 ? (
        <p className="py-12 text-center text-stone-500">Loading tables…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={() => onTableTap(table)} />
          ))}
          {tables.length === 0 ? (
            <p className="col-span-full py-12 text-center text-stone-500">No tables on this floor</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

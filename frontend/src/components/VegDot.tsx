"use client";

import type { VegType } from "@/lib/types";

export function VegDot({ type }: { type: VegType }) {
  const color =
    type === "Veg"
      ? "bg-emerald-500 ring-emerald-700"
      : type === "Egg"
        ? "bg-amber-400 ring-amber-700"
        : "bg-rose-500 ring-rose-700";

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ${color}`}
      title={type}
      aria-label={type}
    />
  );
}

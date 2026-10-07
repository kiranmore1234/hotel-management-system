const tones: Record<string, string> = {
  Vacant: "bg-emerald-100 text-emerald-800",
  Occupied: "bg-rose-100 text-rose-800",
  Billing: "bg-amber-100 text-amber-900",
  Reserved: "bg-sky-100 text-sky-800",
  Open: "bg-amber-100 text-amber-900",
  Closed: "bg-stone-200 text-stone-700",
  Cancelled: "bg-stone-200 text-stone-600",
  Pending: "bg-orange-100 text-orange-800",
  Cooking: "bg-yellow-100 text-yellow-900",
  Ready: "bg-lime-100 text-lime-800",
  Served: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = tones[status] ?? "bg-stone-100 text-stone-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

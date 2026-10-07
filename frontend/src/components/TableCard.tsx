import type { TableDto, TableStatus } from "@/lib/types";

const statusStyles: Record<
  TableStatus,
  { card: string; badge: string; label: string; dot: string }
> = {
  Vacant: {
    card: "border-emerald-400/80 bg-emerald-50 hover:border-emerald-500",
    badge: "bg-emerald-600 text-white",
    label: "Vacant",
    dot: "bg-emerald-500",
  },
  Occupied: {
    card: "border-rose-400/80 bg-rose-50 hover:border-rose-500",
    badge: "bg-rose-600 text-white",
    label: "Occupied",
    dot: "bg-rose-500",
  },
  Billing: {
    card: "border-amber-400/80 bg-amber-50 hover:border-amber-500",
    badge: "bg-amber-500 text-stone-950",
    label: "Billing",
    dot: "bg-amber-400",
  },
  Reserved: {
    card: "border-sky-400/80 bg-sky-50 hover:border-sky-500",
    badge: "bg-sky-600 text-white",
    label: "Reserved",
    dot: "bg-sky-500",
  },
};

interface TableCardProps {
  table: TableDto;
  onClick: () => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
  const style = statusStyles[table.status] ?? statusStyles.Vacant;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`lift-card flex min-h-[108px] w-full flex-col justify-between rounded-2xl border-2 p-3.5 text-left shadow-sm transition active:scale-[0.98] ${style.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <span className="text-xl font-bold text-stone-900">{table.tableNo}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
          {style.label}
        </span>
      </div>
      <div className="text-xs text-stone-600">
        {table.capacity} seats · {table.floorName}
      </div>
    </button>
  );
}

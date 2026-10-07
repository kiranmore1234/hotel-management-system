"use client";

import type { CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface CartBarProps {
  items: CartItem[];
  sending?: boolean;
  onOpen: () => void;
  onSend: () => void;
}

export function CartBar({ items, sending, onOpen, onSend }: CartBarProps) {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 md:bottom-4 safe-bottom">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl bg-stone-950 p-3 text-white shadow-2xl shadow-stone-900/30">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-stone-950">
            {count}
          </span>
          <div>
            <div className="text-sm font-semibold">{formatCurrency(total)}</div>
            <div className="text-[11px] text-stone-400">View cart</div>
          </div>
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={onSend}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-stone-950 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send to Kitchen"}
        </button>
      </div>
    </div>
  );
}

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  note: string;
  sending?: boolean;
  onClose: () => void;
  onNoteChange: (note: string) => void;
  onUpdateQty: (menuItemId: number, quantity: number, isHalf: boolean) => void;
  onSend: () => void;
}

export function CartDrawer({
  open,
  items,
  note,
  sending,
  onClose,
  onNoteChange,
  onUpdateQty,
  onSend,
}: CartDrawerProps) {
  if (!open) return null;

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close cart" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-stone-900">Cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Cart is empty</p>
          ) : (
            items.map((item) => (
              <div
                key={`${item.menuItemId}-${item.isHalf ? "h" : "f"}`}
                className="rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-stone-900">
                      {item.name}
                      {item.isHalf ? " (Half)" : ""}
                    </div>
                    <div className="text-sm text-stone-500">
                      {formatCurrency(item.price)} each
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-stone-900">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm ring-1 ring-stone-200"
                    onClick={() =>
                      onUpdateQty(item.menuItemId, item.quantity - 1, item.isHalf)
                    }
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-base font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm ring-1 ring-stone-200"
                    onClick={() =>
                      onUpdateQty(item.menuItemId, item.quantity + 1, item.isHalf)
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Note</span>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              placeholder="Less spicy, no onion…"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </label>
        </div>

        <div className="border-t border-stone-200 p-4">
          <div className="mb-3 flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0 || sending}
            onClick={onSend}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-4 text-base font-semibold text-stone-950 shadow-sm hover:bg-amber-400 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send to Kitchen"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function VegDot({ vegType }: { vegType: string }) {
  const cls =
    vegType === "Veg"
      ? "status-dot-veg"
      : vegType === "Egg"
        ? "status-dot-egg"
        : "status-dot-nonveg";
  return <span className={`mt-1 shrink-0 ${cls}`} title={vegType} />;
}

"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CartBar, CartDrawer } from "@/components/CartDrawer";
import { ApiError, api, ordersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getDishPhoto } from "@/lib/menuImages";
import type { CartItem, CategoryDto, OrderDto } from "@/lib/types";

export default function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ tableId?: string }>;
}) {
  const { tableId: tableIdParam } = use(searchParams);
  const tableId = Number(tableIdParam);
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<"All" | "Veg" | "South Indian" | "Maharashtrian">("All");
  const [existingOrder, setExistingOrder] = useState<OrderDto | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<CategoryDto[]>("/api/menu");
      setCategories(result);
      setActiveCategoryId((current) => current ?? result[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Menu load nahi ho saka");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Number.isInteger(tableId) || tableId < 1) {
      setError("Table ID missing ya invalid hai. Tables page se dobara select karein.");
      setLoading(false);
      return;
    }
    void loadMenu();
    setOrderLoading(true);
    void ordersApi.byTable(tableId)
      .then(setExistingOrder)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setExistingOrder(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Running order load nahi ho saka");
      })
      .finally(() => setOrderLoading(false));
  }, [tableId, loadMenu]);

  const visibleItems = useMemo(
    () => {
      const query = search.trim().toLocaleLowerCase();
      return categories
        .filter((category) => category.items.some((item) => item.vegType === "Veg"))
        .filter((category) => dietaryFilter === "South Indian" || dietaryFilter === "Maharashtrian"
          ? category.name === dietaryFilter
          : query || activeCategoryId === null || category.id === activeCategoryId)
        .flatMap((category) => category.items)
        .filter((item) => item.vegType === "Veg")
        .filter((item) => {
          const matchesSearch = !query || `${item.name} ${item.description ?? ""} ${item.categoryName}`
            .toLocaleLowerCase()
            .includes(query);
          const matchesFilter = dietaryFilter === "All" ||
            dietaryFilter === "Veg" ||
            item.categoryName === dietaryFilter;
          return matchesSearch && matchesFilter;
        });
    },
    [categories, activeCategoryId, search, dietaryFilter]
  );

  function selectMenuFilter(filter: "All" | "Veg" | "South Indian" | "Maharashtrian") {
    setDietaryFilter(filter);
    setActiveCategoryId(null);
    setSearch("");
  }

  function addToCart(item: CategoryDto["items"][number], isHalf: boolean) {
    setCart((current) => {
      const existing = current.find(
        (line) => line.menuItemId === item.id && line.isHalf === isHalf
      );
      if (existing) {
        return current.map((line) =>
          line.menuItemId === item.id && line.isHalf === isHalf
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          menuItemId: item.id,
          name: item.name,
          price: isHalf && item.hasHalfFull ? item.halfPrice : item.price,
          quantity: 1,
          isHalf,
        },
      ];
    });
  }

  function updateQuantity(menuItemId: number, quantity: number, isHalf: boolean) {
    setCart((current) =>
      quantity < 1
        ? current.filter((line) => !(line.menuItemId === menuItemId && line.isHalf === isHalf))
        : current.map((line) =>
            line.menuItemId === menuItemId && line.isHalf === isHalf
              ? { ...line, quantity }
              : line
          )
    );
  }

  async function sendOrder() {
    if (cart.length === 0 || submitting || orderLoading) return;
    if (existingOrder?.status === "Billing") {
      setError("Is table ka bill ban chuka hai; ab items add nahi kar sakte.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const items = cart.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        note: note.trim() || null,
        isHalf: line.isHalf,
      }));
      if (existingOrder) {
        const updatedOrder = await ordersApi.addItems(existingOrder.id, items);
        setExistingOrder(updatedOrder);
        setCart([]);
        setNote("");
        setCartOpen(false);
        setSuccess(`Items kitchen ko bhej diye (KOT #${updatedOrder.kotCounter}). Aur items yahin se add kar sakte hain.`);
        return;
      } else {
        await ordersApi.create({
          tableId,
          guests: Math.max(1, guests),
          customerName: null,
          customerPhone: null,
          items,
        });
      }
      router.replace(`/orders/${tableId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order create nahi ho saka");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-28">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/tables")}
            className="mb-2 text-sm font-medium text-amber-700"
          >
            ← Tables
          </button>
          <h1 className="font-display text-3xl font-semibold text-[#26342c]">{existingOrder ? "Add to order" : "New order"} · Table {tableIdParam}</h1>
          <p className="text-sm text-stone-500">{existingOrder ? `Running order ${existingOrder.orderNumber} mein menu add karein` : "Menu se items add karke kitchen ko bhejein"}</p>
        </div>
        {!existingOrder ? <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
          <label htmlFor="guest-count" className="text-sm font-medium text-stone-600">Guests</label>
          <input
            id="guest-count"
            type="number"
            min={1}
            max={99}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value) || 1)}
            className="min-h-10 w-16 rounded-lg border border-stone-300 px-2 text-center"
          />
        </div> : null}
      </div>

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          {!loading && categories.length === 0 ? (
            <button type="button" onClick={() => void loadMenu()} className="font-semibold underline">Retry</button>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-stone-500">Menu load ho raha hai…</p>
      ) : (
        <>
          <label className="mb-4 block">
            <span className="sr-only">Search menu</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search all menu items…"
              className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => selectMenuFilter("All")}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold ${
                activeCategoryId === null && !search
                  ? "bg-amber-500 text-stone-950"
                  : "bg-white text-stone-700 ring-1 ring-stone-200"
              }`}
            >
              All menu
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setDietaryFilter("All");
                  setSearch("");
                  setActiveCategoryId(category.id);
                }}
                className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold ${
                  activeCategoryId === category.id && !search
                    ? "bg-amber-500 text-stone-950"
                    : "bg-white text-stone-700 ring-1 ring-stone-200"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter menu by food type">
            {([
              ["All", "All items"],
              ["Veg", "Veg"],
              ["South Indian", "South Indian"],
              ["Maharashtrian", "Maharashtrian"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectMenuFilter(value)}
                aria-pressed={dietaryFilter === value}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold ${
                  dietaryFilter === value
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-700 ring-1 ring-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-center text-stone-500 shadow-sm ring-1 ring-stone-200">
              {search ? "Koi matching menu item nahi mila. Spelling check karein ya search clear karein." : "Is filter/category mein abhi koi available item nahi hai."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <article key={item.id} className="food-card lift-card overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e8e3d8]">
                  <div className="relative overflow-hidden">
                    <Image src={getDishPhoto(item)} alt={item.name} width={900} height={506} unoptimized className="food-image aspect-[16/9] w-full object-cover" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-[#26342c] shadow">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="mb-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Veg</span>
                      <h2 className="font-display text-lg font-semibold text-[#26342c]">{item.name}</h2>
                      <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-stone-500">{item.description || item.categoryName}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-[#eee9df] pt-3">
                    <button
                      type="button"
                      onClick={() => addToCart(item, false)}
                      className="min-h-10 flex-1 rounded-xl bg-[#18352c] px-3 text-sm font-semibold text-white transition hover:bg-[#294d40]"
                    >
                      Add to order
                    </button>
                    {item.hasHalfFull ? (
                      <button
                        type="button"
                        onClick={() => addToCart(item, true)}
                        className="min-h-10 flex-1 rounded-xl bg-[#f2e8d9] px-3 text-sm font-semibold text-[#745331] transition hover:bg-[#ead9c0]"
                      >
                        Half · {formatCurrency(item.halfPrice)}
                      </button>
                    ) : null}
                  </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {error && cart.length > 0 ? <p className="mt-3 text-sm text-rose-700">Order send nahi hua; cart safe hai.</p> : null}
      <CartBar
        items={cart}
        sending={submitting || orderLoading}
        onOpen={() => setCartOpen(true)}
        onSend={() => void sendOrder()}
      />
      <CartDrawer
        open={cartOpen}
        items={cart}
        note={note}
        sending={submitting}
        onClose={() => setCartOpen(false)}
        onNoteChange={setNote}
        onUpdateQty={updateQuantity}
        onSend={() => void sendOrder()}
      />
    </div>
  );
}

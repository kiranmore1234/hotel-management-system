"use client";

import { useCallback, useEffect, useState } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { isManagerOrAdmin } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getDishPhoto } from "@/lib/menuImages";
import type { CategoryDto, MenuItemDto } from "@/types";

export default function MenuManagerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState<"All" | "Veg">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const data = await api<CategoryDto[]>("/api/menu?includeUnavailable=true");
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setFetching(false);
    }
  }, []);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return categories
      .filter((category) => categoryFilter === "All" || category.name === categoryFilter)
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesTerm = !term || `${item.name} ${item.description ?? ""} ${category.name} ${item.vegType}`.toLocaleLowerCase().includes(term);
          const matchesDiet = item.vegType === "Veg" && (dietFilter === "All" || dietFilter === "Veg");
          return matchesTerm && matchesDiet;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, categoryFilter, dietFilter, search]);

  const visibleCount = filteredCategories.reduce((count, category) => count + category.items.length, 0);

  function selectDiet(type: "All" | "Veg") {
    setDietFilter(type);
    setCategoryFilter("All");
    setSearch("");
  }

  function selectCategory(categoryName: string) {
    setCategoryFilter(categoryName);
    setDietFilter("All");
    setSearch("");
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isManagerOrAdmin(user.role)) {
      router.replace("/tables");
      return;
    }
    void load();
  }, [user, loading, router, load]);

  async function toggleAvailability(item: MenuItemDto) {
    setBusyId(item.id);
    setError("");
    try {
      await api(
        `/api/menu/items/${item.id}/availability?available=${!item.isAvailable}`,
        { method: "PATCH" }
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936b3f]">Restaurant catalog</p>
        <h1 className="font-display text-3xl font-semibold text-[#26342c]">Our menu</h1>
        <p className="text-sm text-slate-500">Choose a cuisine to open its dishes, or search by dish name, ingredients, or food type.</p>
      </div>

      <div className="mb-5 space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#e8e3d8] sm:p-4">
        <label className="block">
          <span className="sr-only">Search dishes</span>
          <input
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);
              if (value.trim()) {
                setCategoryFilter("All");
                setDietFilter("All");
              }
            }}
            placeholder="Search dishes or ingredients"
            className="min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" aria-label="Filter by diet">
            {(["All", "Veg"] as const).map((type) => (
              <button key={type} type="button" onClick={() => selectDiet(type)} aria-pressed={dietFilter === type} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${dietFilter === type ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                {type === "All" ? "All" : type}
              </button>
            ))}
          </div>
          <label className="ml-auto flex min-h-10 items-center gap-2 text-sm text-stone-600">
            <span className="sr-only">Filter by cuisine</span>
            <select value={categoryFilter} onChange={(event) => selectCategory(event.target.value)} className="min-h-10 max-w-48 rounded-lg border border-stone-300 bg-white px-3 text-sm">
              <option value="All">All menus</option>
              {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <span aria-live="polite" className="w-full text-xs text-stone-500 sm:ml-auto sm:w-auto">{visibleCount} dishes</span>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {fetching ? (
        <p className="py-12 text-center text-slate-500">Loading menu…</p>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <section key={cat.id} id={`menu-category-${cat.id}`} className="scroll-mt-24">
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                {cat.name}
                {cat.kitchenSection ? (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({cat.kitchenSection})
                  </span>
                ) : null}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="food-card lift-card overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e8e3d8]"
                  >
                    <div className="overflow-hidden">
                      <Image src={getDishPhoto(item)} alt={item.name} width={900} height={506} unoptimized className="food-image aspect-[16/9] w-full object-cover" />
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">ID {item.id} · Veg</div>
                        </div>
                        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-1 ${item.vegType === "Veg" ? "bg-emerald-500 ring-emerald-700" : item.vegType === "NonVeg" ? "bg-rose-500 ring-rose-700" : "bg-amber-400 ring-amber-700"}`} aria-label={item.vegType} />
                      </div>
                      {item.description ? <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p> : null}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                        <div className="text-sm font-semibold text-stone-900">
                          {formatCurrency(item.price)}{item.hasHalfFull ? ` · Half ${formatCurrency(item.halfPrice)}` : ""}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.isAvailable ? "Vacant" : "Cancelled"} />
                          <button type="button" disabled={busyId === item.id} onClick={() => void toggleAvailability(item)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${item.isAvailable ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
                            {item.isAvailable ? "Mark out" : "Mark in"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {visibleCount === 0 ? <p className="rounded-lg bg-white p-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">No dishes match. Try another menu, food type, or search.</p> : null}
        </div>
      )}
    </AppShell>
  );
}

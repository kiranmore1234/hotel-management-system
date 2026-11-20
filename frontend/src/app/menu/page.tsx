"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import type { CategoryDto, MenuItemDto, VegType } from "@/types";

type MenuItemForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  halfPrice: string;
  taxPercent: string;
  vegType: VegType;
  hasHalfFull: boolean;
  isAvailable: boolean;
  imageUrl: string;
};

const emptyMenuItemForm: MenuItemForm = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  halfPrice: "",
  taxPercent: "5",
  vegType: "Veg",
  hasHalfFull: false,
  isAvailable: true,
  imageUrl: "",
};

const inputClass = "min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-[#26342c] outline-none focus:border-[#a36f32] focus:ring-2 focus:ring-[#ead8bd]";

export default function MenuManagerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState<"All" | "Veg" | "NonVeg">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [itemForm, setItemForm] = useState<MenuItemForm>(emptyMenuItemForm);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [kitchenSection, setKitchenSection] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () => api<CategoryDto[]>("/api/menu?includeUnavailable=true"),
    []
  );

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return categories
      .filter((category) => categoryFilter === "All" || category.name === categoryFilter)
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesTerm = !term || `${item.name} ${item.description ?? ""} ${category.name} ${item.vegType}`.toLocaleLowerCase().includes(term);
          const matchesDiet = dietFilter === "All" || item.vegType === dietFilter;
          return matchesTerm && matchesDiet;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, categoryFilter, dietFilter, search]);

  const visibleCount = filteredCategories.reduce((count, category) => count + category.items.length, 0);

  function selectDiet(type: "All" | "Veg" | "NonVeg") {
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
    void load()
      .then((data) => {
        setCategories(data);
        setError("");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load menu");
      })
      .finally(() => setFetching(false));
  }, [user, loading, router, load]);

  async function toggleAvailability(item: MenuItemDto) {
    setBusyId(item.id);
    setError("");
    try {
      await api(
        `/api/menu/items/${item.id}/availability?available=${!item.isAvailable}`,
        { method: "PATCH" }
      );
      setCategories(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function startEditing(item: MenuItemDto) {
    setEditingItemId(item.id);
    setItemForm({
      categoryId: String(item.categoryId),
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      halfPrice: String(item.halfPrice),
      taxPercent: String(item.taxPercent),
      vegType: item.vegType,
      hasHalfFull: item.hasHalfFull,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl ?? "",
    });
    setItemFormOpen(true);
    setError("");
  }

  function resetItemForm() {
    setItemForm(emptyMenuItemForm);
    setEditingItemId(null);
    setItemFormOpen(false);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        categoryId: Number(itemForm.categoryId),
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        price: Number(itemForm.price),
        halfPrice: itemForm.hasHalfFull ? Number(itemForm.halfPrice) : 0,
        taxPercent: Number(itemForm.taxPercent),
        vegType: itemForm.vegType,
        hasHalfFull: itemForm.hasHalfFull,
        isAvailable: itemForm.isAvailable,
        imageUrl: itemForm.imageUrl.trim() || null,
      };
      if (editingItemId === null) {
        await api("/api/menu/items", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await api(`/api/menu/items/${editingItemId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: payload.name,
            description: payload.description,
            price: payload.price,
            halfPrice: payload.halfPrice,
            taxPercent: payload.taxPercent,
            vegType: payload.vegType,
            hasHalfFull: payload.hasHalfFull,
            isAvailable: payload.isAvailable,
            imageUrl: payload.imageUrl,
          }),
        });
      }
      setCategories(await load());
      resetItemForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Menu item could not be saved");
    } finally {
      setSaving(false);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const category = await api<CategoryDto>("/api/menu/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName.trim(),
          kitchenSection: kitchenSection.trim() || null,
          sortOrder: categories.length + 1,
        }),
      });
      setCategories(await load());
      setItemForm((current) => ({ ...current, categoryId: String(category.id) }));
      setCategoryName("");
      setKitchenSection("");
      setCategoryFormOpen(false);
      setItemFormOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Menu category could not be created");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: MenuItemDto) {
    if (!window.confirm(`Remove "${item.name}" from the active menu? Existing order history will be kept.`)) return;
    setBusyId(item.id);
    setError("");
    try {
      await api(`/api/menu/items/${item.id}`, { method: "DELETE" });
      setCategories(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Menu item could not be removed");
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { resetItemForm(); setItemFormOpen((open) => !open); setCategoryFormOpen(false); }} className="min-h-10 rounded-xl bg-[#18352c] px-4 text-sm font-semibold text-white hover:bg-[#285543]">
            {itemFormOpen && editingItemId === null ? "Close item form" : "＋ Add menu item"}
          </button>
          <button type="button" onClick={() => { setCategoryFormOpen((open) => !open); setItemFormOpen(false); }} className="min-h-10 rounded-xl border border-[#d8d2c6] bg-white px-4 text-sm font-semibold text-[#34473c] hover:bg-stone-50">
            ＋ Add category
          </button>
        </div>
      </div>

      {categoryFormOpen ? (
        <form onSubmit={(event) => void createCategory(event)} className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e8e3d8] sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-semibold text-stone-600">Category name
            <input required maxLength={100} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. Maharashtrian" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Kitchen section
            <input maxLength={50} value={kitchenSection} onChange={(event) => setKitchenSection(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. Indian" />
          </label>
          <button disabled={saving} className="min-h-11 rounded-xl bg-[#18352c] px-5 text-sm font-semibold text-white disabled:opacity-50">Create category</button>
        </form>
      ) : null}

      {itemFormOpen ? (
        <form onSubmit={(event) => void saveItem(event)} className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e8e3d8] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#26342c]">{editingItemId === null ? "Add menu item" : "Edit menu item"}</h2>
            <button type="button" onClick={resetItemForm} className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 hover:bg-stone-100">Cancel</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {editingItemId === null ? (
              <label className="text-xs font-semibold text-stone-600">Category
                <select required value={itemForm.categoryId} onChange={(event) => setItemForm({ ...itemForm, categoryId: event.target.value })} className={`${inputClass} mt-1.5`}>
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="text-xs font-semibold text-stone-600">Dish name
              <input required maxLength={150} value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="text-xs font-semibold text-stone-600">Food type
              <select value={itemForm.vegType} onChange={(event) => setItemForm({ ...itemForm, vegType: event.target.value as VegType })} className={`${inputClass} mt-1.5`}>
                <option value="Veg">Veg</option><option value="NonVeg">Non-veg</option><option value="Egg">Egg</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-stone-600">Price (₹)
              <input required type="number" min="0.01" step="0.01" value={itemForm.price} onChange={(event) => setItemForm({ ...itemForm, price: event.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="text-xs font-semibold text-stone-600">Tax (%)
              <input required type="number" min="0" max="100" step="0.01" value={itemForm.taxPercent} onChange={(event) => setItemForm({ ...itemForm, taxPercent: event.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            {itemForm.hasHalfFull ? (
              <label className="text-xs font-semibold text-stone-600">Half price (₹)
                <input required type="number" min="0.01" step="0.01" value={itemForm.halfPrice} onChange={(event) => setItemForm({ ...itemForm, halfPrice: event.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
            ) : null}
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2 lg:col-span-3">Description
              <textarea rows={2} maxLength={1000} value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} className={`${inputClass} py-2.5`} />
            </label>
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2 lg:col-span-3">Dish image URL (optional)
              <input type="url" value={itemForm.imageUrl} onChange={(event) => setItemForm({ ...itemForm, imageUrl: event.target.value })} className={`${inputClass} mt-1.5`} placeholder="https://…" />
            </label>
            <div className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2 lg:col-span-3">
              <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={itemForm.hasHalfFull} onChange={(event) => setItemForm({ ...itemForm, hasHalfFull: event.target.checked, halfPrice: event.target.checked ? itemForm.halfPrice : "" })} />Half/full pricing</label>
              <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={itemForm.isAvailable} onChange={(event) => setItemForm({ ...itemForm, isAvailable: event.target.checked })} />Available to order</label>
            </div>
          </div>
          <button disabled={saving} className="mt-4 min-h-11 rounded-xl bg-[#18352c] px-5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : editingItemId === null ? "Save menu item" : "Save changes"}
          </button>
        </form>
      ) : null}

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
            {(["All", "Veg", "NonVeg"] as const).map((type) => (
              <button key={type} type="button" onClick={() => selectDiet(type)} aria-pressed={dietFilter === type} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${dietFilter === type ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                {type === "All" ? "All" : type === "NonVeg" ? "Non-veg" : type}
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
              <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cat.items.map((item) => {
                  const photoUrl = getDishPhoto(item);
                  return (
                    <div
                      key={item.id}
                      className="food-card lift-card h-fit overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e8e3d8]"
                    >
                      {photoUrl ? (
                        <div className="overflow-hidden">
                          <Image src={photoUrl} alt={item.name} width={900} height={506} unoptimized className="food-image aspect-[16/9] w-full object-cover" />
                        </div>
                      ) : null}
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">ID {item.id} · {item.vegType}</div>
                          </div>
                          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-1 ${item.vegType === "Veg" ? "bg-emerald-500 ring-emerald-700" : item.vegType === "NonVeg" ? "bg-rose-500 ring-rose-700" : "bg-amber-400 ring-amber-700"}`} aria-label={item.vegType} />
                        </div>
                        {item.description ? <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p> : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                          <div className="text-sm font-semibold text-stone-900">
                            {formatCurrency(item.price)}{item.hasHalfFull ? ` · Half ${formatCurrency(item.halfPrice)}` : ""}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.isAvailable ? "Available" : "Out of stock"} />
                            <button type="button" disabled={busyId === item.id} onClick={() => void toggleAvailability(item)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${item.isAvailable ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
                              {item.isAvailable ? "Mark out" : "Mark in"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2 border-t border-stone-100 pt-2">
                          <button type="button" onClick={() => startEditing(item)} className="min-h-9 rounded-lg bg-stone-100 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-200">Edit</button>
                          <button type="button" disabled={busyId === item.id} onClick={() => void deleteItem(item)} className="min-h-9 rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Remove</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {visibleCount === 0 ? <p className="rounded-lg bg-white p-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">No dishes match. Try another menu, food type, or search.</p> : null}
        </div>
      )}
    </AppShell>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PublicPage } from "@/components/PublicSite";
import { api } from "@/lib/api";
import { getDishPhoto } from "@/lib/menuImages";
import { formatCurrency } from "@/lib/format";
import type { CategoryDto } from "@/types";

export default function PublicMenuPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    void api<CategoryDto[]>("/api/menu/public", { skipAuth: true })
      .then((result) => {
        if (mounted) {
          setCategories(result);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (mounted) setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => selectedCategory === "All" || category.name === selectedCategory),
    [categories, selectedCategory]
  );

  return (
    <PublicPage>
      <section className="bg-[#173d32] px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e5b76d]">Fresh from our kitchen</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-5xl font-semibold sm:text-6xl">Our menu</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">A little something for every appetite. Explore what we’re serving today.</p>
            </div>
            {status === "ready" ? <p className="text-sm text-white/65">{categories.reduce((count, category) => count + category.items.length, 0)} dishes</p> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">The printed menu</p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Take a closer look at our menu card.</h2>
          <p className="mt-3 text-sm leading-6 text-[#657268]">
            Explore our thalis and kitchen favourites. Open a menu card to view the full-size image.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MenuPhotoCard
            src="/images/niyojan-menu-thalis.png"
            alt="Niyojan Resto printed menu card showing signature thalis"
            title="Signature thalis"
          />
          <MenuPhotoCard
            src="/images/niyojan-menu-main.png"
            alt="Niyojan Resto printed menu card showing starters, rice, and main courses"
            title="Starters, mains & rice"
          />
          <MenuPhotoCard
            src="/images/niyojan-signature-thali.png"
            alt="A signature thali served at Niyojan Resto"
            title="A thali from our kitchen"
            contain={false}
          />
          <MenuPhotoCard
            src="/images/niyojan-thali-promo.png"
            alt="Niyojan Resto thali special menu poster"
            title="Thali special"
            wide
          />
        </div>
      </section>

      <section className="mx-auto min-h-[50vh] max-w-7xl px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        {status === "loading" ? <p className="py-16 text-center text-sm text-[#657268]">Loading today’s menu…</p> : null}
        {status === "error" ? (
          <div role="alert" className="rounded-2xl border border-[#e8c8bc] bg-[#fff5f1] px-5 py-4 text-sm text-[#8d4433]">
            The menu couldn’t load right now. Please try again in a moment or contact the restaurant.
          </div>
        ) : null}
        {status === "ready" ? (
          <>
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filter menu categories">
              <CategoryButton active={selectedCategory === "All"} onClick={() => setSelectedCategory("All")}>Everything</CategoryButton>
              {categories.map((category) => (
                <CategoryButton key={category.id} active={selectedCategory === category.name} onClick={() => setSelectedCategory(category.name)}>
                  {category.name}
                </CategoryButton>
              ))}
            </div>
            <div className="space-y-12">
              {visibleCategories.map((category) => (
                <section key={category.id} aria-labelledby={`public-category-${category.id}`}>
                  <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#e7dfd1] pb-3">
                    <div>
                      <h2 id={`public-category-${category.id}`} className="font-display text-3xl font-semibold">{category.name}</h2>
                      {category.kitchenSection ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#879187]">{category.kitchenSection} kitchen</p> : null}
                    </div>
                    <span className="text-xs text-[#879187]">{category.items.length} items</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {category.items.map((item) => {
                      const photoUrl = getDishPhoto(item);
                      return (
                        <article key={item.id} className="overflow-hidden rounded-[22px] border border-[#e9e1d3] bg-white shadow-[0_8px_24px_rgba(39,48,39,0.04)]">
                          {photoUrl ? (
                            <div className="relative aspect-[16/10] overflow-hidden bg-[#efe8da]">
                              <Image src={photoUrl} alt={item.name} fill unoptimized sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                            </div>
                          ) : null}
                          <div className="flex min-h-28 items-start justify-between gap-3 p-5">
                            <div>
                              <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.vegType === "Veg" ? "bg-[#edf3ec] text-[#356046]" : "bg-[#fff0e8] text-[#9b4c30]"}`}>{item.vegType === "Veg" ? "Vegetarian" : item.vegType === "NonVeg" ? "Non-vegetarian" : "Egg"}</span>
                              <h3 className="font-display text-xl font-semibold">{item.name}</h3>
                              {item.description ? <p className="mt-1.5 text-sm leading-5 text-[#758076]">{item.description}</p> : null}
                            </div>
                            <span className="shrink-0 pt-1 text-sm font-bold text-[#8a5d2b]">{formatCurrency(item.price)}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
              {visibleCategories.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#657268]">No menu items are available at the moment.</p> : null}
            </div>
          </>
        ) : null}
      </section>
    </PublicPage>
  );
}

function MenuPhotoCard({ src, alt, title, contain = true, wide = false }: { src: string; alt: string; title: string; contain?: boolean; wide?: boolean }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-[22px] border border-[#e9e1d3] bg-white shadow-[0_8px_24px_rgba(39,48,39,0.04)]"
    >
      <div className={`relative overflow-hidden bg-[#efe8da] ${wide ? "aspect-[3/1]" : "aspect-[4/5]"} ${contain ? "p-2" : ""}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 100vw"
          className={contain ? "object-contain transition group-hover:scale-[1.02]" : "object-cover transition group-hover:scale-[1.02]"}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-semibold text-[#21372d]">{title}</span>
        <span aria-hidden="true" className="text-sm text-[#8a5d2b]">↗</span>
      </div>
    </a>
  );
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${active ? "bg-[#173d32] text-white" : "bg-[#efe8da] text-[#52665a] hover:bg-[#e5ddce]"}`}>
      {children}
    </button>
  );
}

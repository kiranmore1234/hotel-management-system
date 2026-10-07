"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [restaurantName, setRestaurantName] = useState("Bramhand");

  useEffect(() => {
    if (!user) return;
    void api<{ restaurantName: string }>("/api/settings")
      .then((settings) => setRestaurantName(settings.restaurantName))
      .catch(() => undefined);
  }, [user]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-[#f7f5ef] md:flex">
      <aside className="hidden w-[272px] shrink-0 flex-col bg-[#18352c] px-5 py-6 text-white md:sticky md:top-0 md:flex md:h-dvh">
        <Link href="/dashboard" className="rounded-2xl px-2 py-1">
          <BrandLogo name={restaurantName} />
        </Link>
        <p className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94a99e]">Service</p>
        <nav className="mt-3 space-y-1.5">
          {[
            { href: "/dashboard", label: "Home", icon: "⌂" },
            { href: "/tables", label: "Tables", icon: "▦" },
            { href: "/menu", label: "Menu", icon: "≡" },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-all duration-200 ${active ? "bg-[#c8a36c] text-[#18352c] shadow-lg shadow-black/10" : "text-[#d2ddd6] hover:bg-white/10 hover:text-white"}`}><span className="w-5 text-center text-lg" aria-hidden="true">{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94a99e]">Restaurant</p>
        <nav className="mt-3 space-y-1.5">
          <Link href="/about" className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#d2ddd6] transition hover:bg-white/10 hover:text-white"><span className="w-5 text-center text-lg" aria-hidden="true">ⓘ</span>About</Link>
          {user?.role === "Admin" ? <Link href="/settings" className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#d2ddd6] transition hover:bg-white/10 hover:text-white"><span className="w-5 text-center text-lg" aria-hidden="true">⚙</span>Settings</Link> : null}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-black/10 p-3">
          <div className="px-1 text-sm font-medium">{user?.name}</div>
          {user ? <div className="px-1 pt-1 text-xs text-[#a8b9af]">{user.role} · ID {user.id}</div> : null}
          <button type="button" onClick={handleLogout} className="mt-4 min-h-10 w-full rounded-xl bg-white/10 px-3 text-left text-sm font-medium text-[#e3e9e4] transition hover:bg-white/15">Sign out</button>
        </div>
      </aside>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-[#e8e3d8] bg-[#fbfaf6]/95 px-4 backdrop-blur md:hidden"><BrandLogo name={restaurantName} compact tone="light" />{user ? <span className="ml-auto rounded-full bg-[#edf0eb] px-2.5 py-1 text-[10px] font-semibold text-[#52665a]">{user.role}</span> : null}</header>
        <main className="page-enter mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 pb-24 sm:px-6 md:px-9 md:py-9 md:pb-9">{children}</main>
      </div>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#e8e3d8] bg-[#fbfaf6]/95 backdrop-blur md:hidden"><div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">{[
        { href: "/dashboard", label: "Home", icon: "⌂" },
        { href: "/tables", label: "Tables", icon: "▦" },
        { href: "/menu", label: "Menu", icon: "≡" },
        { href: "/about", label: "About", icon: "ⓘ" },
        ...(user?.role === "Admin" ? [{ href: "/settings", label: "Settings", icon: "⚙" }] : []),
      ].map((item) => <Link key={item.href} href={item.href} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${pathname === item.href ? "text-[#936b3f]" : "text-[#879187]"}`}><span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</div></nav>
    </div>
  );
}

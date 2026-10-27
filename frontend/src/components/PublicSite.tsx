"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/our-menu", label: "Our menu" },
  { href: "/story", label: "Our story" },
  { href: "/contact", label: "Visit us" },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isManager, logout } = useAuth();
  const router = useRouter();
  const navigationLinks = [
    ...links.slice(1),
    ...(isManager ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e9e1d3] bg-[#fbf8f1]/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Niyojan Resto home" onClick={() => setMenuOpen(false)}>
          <BrandLogo name="Niyojan Resto" compact tone="light" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex sm:gap-2">
          {navigationLinks.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold text-[#42544a] transition hover:bg-[#efe8da] sm:px-3.5 sm:text-sm">
              {link.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} className="whitespace-nowrap rounded-full bg-[#173d32] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#245848] sm:px-5 sm:text-sm">
            Sign out
          </button>
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <button type="button" onClick={handleLogout} className="rounded-full bg-[#173d32] px-3 py-2.5 text-xs font-semibold text-white">Sign out</button>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-public-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-full border border-[#d9d0c0] text-lg"
          >
            <span className="sr-only">{menuOpen ? "Close navigation" : "Open navigation"}</span>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id="mobile-public-navigation" aria-label="Mobile navigation" className="grid gap-1 border-t border-[#e9e1d3] px-4 py-3 sm:hidden">
          {navigationLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#42544a] hover:bg-[#efe8da]">
              {link.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#42544a] hover:bg-[#efe8da]">
            Sign out
          </button>
        </nav>
      ) : null}
    </header>
  );
}

export function PublicFooter() {
  const { isManager } = useAuth();

  return (
    <footer className="bg-[#173d32] text-[#f5eddf]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <BrandLogo name="Niyojan Resto" tone="dark" />
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            Thoughtful food, warm hospitality, and a table ready to welcome you.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
          <Link href="/our-menu" className="hover:text-white">Our menu</Link>
          <Link href="/story" className="hover:text-white">Our story</Link>
          <Link href="/contact" className="hover:text-white">Visit us</Link>
          {isManager ? <Link href="/dashboard" className="hover:text-white">Dashboard</Link> : null}
        </div>
        <p className="text-xs text-white/45 md:col-span-2">© {new Date().getFullYear()} Niyojan Resto</p>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fbf8f1] text-sm text-[#657268]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#fbf8f1] text-[#21372d]">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

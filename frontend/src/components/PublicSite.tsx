"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/service", label: "Service" },
  { href: "/our-menu", label: "Menu" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isManager, logout } = useAuth();
  const router = useRouter();
  const navigationLinks = [
    ...links,
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
          {user ? (
            <button type="button" onClick={handleLogout} className="whitespace-nowrap rounded-full bg-[#173d32] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#245848] sm:px-5 sm:text-sm">
              Sign out
            </button>
          ) : (
            <Link href="/login" className="whitespace-nowrap rounded-full bg-[#173d32] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#245848] sm:px-5 sm:text-sm">
              Staff sign in
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          {user ? (
            <button type="button" onClick={handleLogout} className="rounded-full bg-[#173d32] px-3 py-2.5 text-xs font-semibold text-white">Sign out</button>
          ) : (
            <Link href="/login" className="rounded-full bg-[#173d32] px-3 py-2.5 text-xs font-semibold text-white">Staff sign in</Link>
          )}
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
          {user ? (
            <button type="button" onClick={handleLogout} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#42544a] hover:bg-[#efe8da]">
              Sign out
            </button>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#42544a] hover:bg-[#efe8da]">
              Staff sign in
            </Link>
          )}
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
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/service" className="hover:text-white">Service</Link>
          {isManager ? <Link href="/dashboard" className="hover:text-white">Dashboard</Link> : null}
        </div>
        <p className="text-xs text-white/45 md:col-span-2">© {new Date().getFullYear()} Niyojan Resto</p>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#fbf8f1] text-[#21372d]">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

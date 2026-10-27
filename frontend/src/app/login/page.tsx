"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isManagerOrAdmin, useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isManagerOrAdmin(user.role) ? "/" : "/tables");
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await login(
        username.trim(),
        mode === "password" ? password : undefined,
        mode === "pin" ? pin : undefined
      );
      router.replace(isManagerOrAdmin(session.role) ? "/" : "/tables");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#18352c] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,163,108,0.27),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(39,83,67,0.5),_transparent_55%)]" />
      <div className="page-enter relative w-full max-w-md rounded-[28px] border border-white/60 bg-[#fbfaf6] p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLogo name="Niyojan Resto" tone="light" />
          <p className="mt-3 text-sm text-slate-500">One sign-in for Niyojan staff and dashboard · लॉगिन</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`min-h-11 rounded-lg text-sm font-semibold transition ${
              mode === "password"
                ? "bg-white text-[#18352c] shadow"
                : "text-slate-500"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("pin")}
            className={`min-h-11 rounded-lg text-sm font-semibold transition ${
              mode === "pin"               ? "bg-white text-[#18352c] shadow" : "text-slate-500"
            }`}
          >
            4-digit PIN
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Username
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="min-h-12 w-full rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="admin / manager / captain"
            />
          </label>

          {mode === "password" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="min-h-12 w-full rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="••••••••"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                PIN / पिन
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                className="min-h-12 w-full rounded-xl border border-stone-300 px-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="••••"
              />
            </label>
          )}

          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#18352c] text-base font-semibold text-white shadow transition hover:bg-[#294d40] disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in / प्रवेश"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-slate-500">
          <div className="mb-1 font-semibold text-slate-700">Demo credentials</div>
          <div>admin / admin123</div>
          <div>manager / manager123</div>
          <div>captain PIN 1111</div>
        </div>
      </div>
    </div>
  );
}

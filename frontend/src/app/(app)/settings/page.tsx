"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type SettingsForm = {
  id: number;
  restaurantName: string;
  address: string;
  phone: string;
  gstin: string;
  defaultCgstPercent: number;
  defaultSgstPercent: number;
  serviceChargePercent: number;
  billPrefix: string;
};

const emptySettings: SettingsForm = {
  id: 0,
  restaurantName: "",
  address: "",
  phone: "",
  gstin: "",
  defaultCgstPercent: 2.5,
  defaultSgstPercent: 2.5,
  serviceChargePercent: 0,
  billPrefix: "BH",
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState(emptySettings);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }
    void api<SettingsForm>("/api/settings")
      .then(setSettings)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Settings could not be loaded"))
      .finally(() => setFetching(false));
  }, [user, loading, router]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api<SettingsForm>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          restaurantName: settings.restaurantName,
          address: settings.address || null,
          phone: settings.phone || null,
          gstin: settings.gstin || null,
          defaultCgstPercent: settings.defaultCgstPercent,
          defaultSgstPercent: settings.defaultSgstPercent,
          serviceChargePercent: settings.serviceChargePercent,
          billPrefix: settings.billPrefix,
        }),
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings could not be saved");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== "Admin") return null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase text-amber-700">Restaurant profile</p>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-500">Manage restaurant details and bill defaults.</p>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {saved ? <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Settings saved.</p> : null}
      {fetching ? <p className="py-8 text-sm text-stone-500">Loading settings…</p> : (
        <form onSubmit={(event) => void save(event)} className="space-y-6">
          <section className="border-b border-stone-200 pb-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-stone-900">Restaurant details</h2>
              <span className="text-xs text-stone-500">Restaurant ID {settings.id}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Restaurant name" value={settings.restaurantName} required onChange={(value) => update("restaurantName", value)} />
              <Field label="Phone" value={settings.phone} onChange={(value) => update("phone", value)} />
              <Field label="Address" value={settings.address} onChange={(value) => update("address", value)} />
              <Field label="GSTIN" value={settings.gstin} onChange={(value) => update("gstin", value)} />
            </div>
          </section>

          <section className="border-b border-stone-200 pb-6">
            <h2 className="mb-4 text-base font-semibold text-stone-900">Billing defaults</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="CGST (%)" value={settings.defaultCgstPercent} onChange={(value) => update("defaultCgstPercent", value)} />
              <NumberField label="SGST (%)" value={settings.defaultSgstPercent} onChange={(value) => update("defaultSgstPercent", value)} />
              <NumberField label="Service charge (%)" value={settings.serviceChargePercent} onChange={(value) => update("serviceChargePercent", value)} />
              <Field label="Bill number prefix" value={settings.billPrefix} required onChange={(value) => update("billPrefix", value)} />
            </div>
          </section>

          <button type="submit" disabled={saving || fetching} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block text-sm font-medium text-stone-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-medium text-stone-700">{label}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label>;
}
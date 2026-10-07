"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type RestaurantProfile = {
  id: number;
  restaurantName: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
};

export default function AboutPage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<RestaurantProfile>("/api/settings")
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Restaurant details could not be loaded"));
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase text-amber-700">Restaurant</p>
        <h1 className="text-2xl font-bold text-stone-900">About</h1>
        <p className="text-sm text-stone-500">Restaurant identity and contact details.</p>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {!profile && !error ? <p className="py-8 text-sm text-stone-500">Loading restaurant details…</p> : null}
      {profile ? (
        <dl className="divide-y divide-stone-200 border-y border-stone-200">
          <Detail label="Restaurant name" value={profile.restaurantName} />
          <Detail label="Restaurant ID" value={String(profile.id)} />
          <Detail label="Address" value={profile.address || "Not provided"} />
          <Detail label="Phone" value={profile.phone || "Not provided"} />
          <Detail label="GSTIN" value={profile.gstin || "Not provided"} />
        </dl>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4"><dt className="text-sm text-stone-500">{label}</dt><dd className="text-sm font-medium text-stone-900">{value}</dd></div>;
}
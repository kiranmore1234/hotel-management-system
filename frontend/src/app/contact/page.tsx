"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicPage } from "@/components/PublicSite";
import { api } from "@/lib/api";

type RestaurantContact = {
  restaurantName: string;
  address: string | null;
  phone: string | null;
};

export default function ContactPage() {
  const [profile, setProfile] = useState<RestaurantContact | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    void api<RestaurantContact>("/api/settings/public", { skipAuth: true })
      .then((result) => {
        if (mounted) {
          setProfile(result);
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

  return (
    <PublicPage>
      <section className="bg-[#173d32] px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e5b76d]">Come on in</p>
          <h1 className="mt-3 font-display text-5xl font-semibold sm:text-6xl">We’d love to see you.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Get in touch or find your way to Niyojan Resto. We’ll have a table ready.</p>
        </div>
      </section>
      <section className="mx-auto grid min-h-[46vh] max-w-7xl gap-8 px-5 py-10 sm:px-8 sm:py-14 md:grid-cols-2 lg:px-12">
        {status === "loading" ? <p className="text-sm text-[#657268]">Loading restaurant details…</p> : null}
        {status === "error" ? <p role="alert" className="text-sm text-[#8d4433]">Restaurant contact details are temporarily unavailable. Please try again later.</p> : null}
        {profile ? (
          <>
            <article className="rounded-[26px] border border-[#e9e1d3] bg-white p-6 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f32]">Find us</p>
              <h2 className="mt-3 font-display text-3xl font-semibold">{profile.restaurantName}</h2>
              <p className="mt-4 text-sm leading-6 text-[#657268]">{profile.address || "Please contact the restaurant for the current address."}</p>
              {profile.address ? (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#173d32] px-5 text-sm font-semibold text-white hover:bg-[#245848]">
                  Get directions <span aria-hidden="true" className="ml-2">↗</span>
                </a>
              ) : null}
            </article>
            <article className="rounded-[26px] bg-[#efe8da] p-6 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f32]">Say hello</p>
              <h2 className="mt-3 font-display text-3xl font-semibold">Questions? Give us a call.</h2>
              <p className="mt-4 text-sm leading-6 text-[#657268]">For the latest opening hours, reservations, or a special request, our team will be happy to help.</p>
              {profile.phone ? (
                <a href={`tel:${profile.phone}`} className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#cfc4b1] px-5 text-sm font-semibold hover:bg-white">
                  Call {profile.phone}
                </a>
              ) : (
                <p className="mt-6 text-sm font-medium text-[#657268]">Call details will be available soon.</p>
              )}
              <Link href="/our-menu" className="mt-5 block text-sm font-semibold text-[#8a5d2b] hover:text-[#173d32]">Take a look at the menu →</Link>
            </article>
          </>
        ) : null}
      </section>
    </PublicPage>
  );
}

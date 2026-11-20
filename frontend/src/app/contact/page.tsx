"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PublicPage } from "@/components/PublicSite";
import { api } from "@/lib/api";

type RestaurantContact = {
  restaurantName: string;
  address: string | null;
  phone: string | null;
};

const fieldClass =
  "mt-1.5 block min-h-12 w-full rounded-xl border border-[#ded6c8] bg-white px-3.5 text-sm text-[#21372d] outline-none transition placeholder:text-stone-400 focus:border-[#a36f32] focus:ring-2 focus:ring-[#ead8bd]";

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export default function ContactPage() {
  const [profile, setProfile] = useState<RestaurantContact | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reservationUrl, setReservationUrl] = useState("");
  const [reservationError, setReservationError] = useState("");

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

  function requestReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.phone) {
      setReservationError("The restaurant WhatsApp number is unavailable. Please use the call option above.");
      return;
    }

    const whatsappNumber = getWhatsAppNumber(profile.phone);
    if (!whatsappNumber) {
      setReservationError("The restaurant phone number is not valid for WhatsApp. Please use the call option above.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("guestName") ?? "").trim();
    const phone = String(form.get("guestPhone") ?? "").trim();
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    const guests = String(form.get("guests") ?? "");
    const note = String(form.get("note") ?? "").trim();
    const message = [
      `Hello ${profile.restaurantName}, I would like to request a table reservation.`,
      `Name: ${name}`,
      `Contact: ${phone}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Guests: ${guests}`,
      note ? `Special request: ${note}` : "",
      "Please confirm availability.",
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    setReservationError("");
    setReservationUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
      <section id="reservation" className="scroll-mt-24 bg-[#efe8da] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f32]">Your table, your time</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Make a reservation request.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#657268]">
              Share your preferred date and time with our team on WhatsApp. We’ll confirm your table availability directly.
            </p>
            <p className="mt-5 rounded-2xl border border-[#d9cdb9] bg-[#fbf8f1]/70 p-4 text-xs leading-5 text-[#657268]">
              This sends a request only; your reservation is confirmed after the restaurant replies.
            </p>
          </div>
          <div className="rounded-[26px] border border-[#e9e1d3] bg-[#fbf8f1] p-5 shadow-sm sm:p-8">
            <form onSubmit={requestReservation} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#526258]">
                Your name
                <input name="guestName" required minLength={2} maxLength={100} autoComplete="name" className={fieldClass} placeholder="Name for the booking" />
              </label>
              <label className="text-xs font-semibold text-[#526258]">
                Mobile number
                <input name="guestPhone" required type="tel" autoComplete="tel" minLength={8} maxLength={20} className={fieldClass} placeholder="Your contact number" />
              </label>
              <label className="text-xs font-semibold text-[#526258]">
                Date
                <input name="date" required type="date" min={localDateValue()} className={fieldClass} />
              </label>
              <label className="text-xs font-semibold text-[#526258]">
                Preferred time
                <input name="time" required type="time" className={fieldClass} />
              </label>
              <label className="text-xs font-semibold text-[#526258]">
                Number of guests
                <input name="guests" required type="number" min={1} max={30} defaultValue={2} className={fieldClass} />
              </label>
              <label className="text-xs font-semibold text-[#526258]">
                Special request <span className="font-normal text-stone-400">(optional)</span>
                <input name="note" maxLength={250} className={fieldClass} placeholder="Celebration, seating preference…" />
              </label>
              {reservationError ? <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{reservationError}</p> : null}
              <div className="sm:col-span-2">
                <button type="submit" disabled={status !== "ready" || !profile?.phone} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white transition hover:bg-[#245848] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  Send request on WhatsApp <span aria-hidden="true" className="ml-2">↗</span>
                </button>
                {reservationUrl ? (
                  <p role="status" className="mt-3 text-xs leading-5 text-[#526258]">
                    WhatsApp opened with your request. Send the message there to contact the restaurant. If it did not open,{" "}
                    <a href={reservationUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#8a5d2b] underline underline-offset-2">open WhatsApp</a>.
                  </p>
                ) : status === "loading" ? (
                  <p className="mt-3 text-xs text-[#657268]">Loading restaurant contact details…</p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

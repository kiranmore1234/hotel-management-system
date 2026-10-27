import Image from "next/image";
import Link from "next/link";
import { PublicPage } from "@/components/PublicSite";

const highlights = [
  {
    number: "01",
    title: "Made with care",
    text: "Familiar ingredients, balanced spices, and food prepared fresh for your table.",
  },
  {
    number: "02",
    title: "A place to gather",
    text: "Come by for a quick meal, a family celebration, or an unhurried evening together.",
  },
  {
    number: "03",
    title: "Hospitality, always",
    text: "A warm welcome and thoughtful service are part of every meal at Niyojan.",
  },
];

export default function HomePage() {
  return (
    <PublicPage>
      <section className="relative isolate min-h-[610px] overflow-hidden bg-[#173d32] sm:min-h-[680px]">
        <Image
          src="/images/niyojan-evening.png"
          alt="Niyojan Resto illuminated in the evening"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#10291f]/90 via-[#10291f]/65 to-[#10291f]/10" />
        <div className="relative mx-auto flex min-h-[610px] max-w-7xl items-center px-5 py-16 sm:min-h-[680px] sm:px-8 lg:px-12">
          <div className="max-w-2xl text-white">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#e9bd79] sm:text-sm">
              Welcome to Niyojan Resto
            </p>
            <h1 className="max-w-xl font-display text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
              Good food brings us together.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              Find your next favourite, share another plate, and make a little more room around the table.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/our-menu" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#e5b76d] px-6 text-sm font-bold text-[#21372d] transition hover:bg-[#f0ca8a]">
                Explore our menu <span aria-hidden="true" className="ml-2">↗</span>
              </Link>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 px-6 text-sm font-semibold text-white transition hover:bg-white/10">
                Plan your visit
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-3 text-sm text-white/75">
              <span className="h-px w-10 bg-[#e5b76d]" />
              Made for good company
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12 lg:py-28">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">The Niyojan welcome</p>
          <h2 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-tight text-[#21372d] sm:text-5xl">
            Settle in. We’ll take care of the rest.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#657268]">
            A meal is more than what’s on the plate. It’s the people around it, the stories that stretch into the evening, and the comfort of feeling right at home.
          </p>
          <Link href="/story" className="mt-7 inline-flex min-h-11 items-center font-semibold text-[#8a5d2b] hover:text-[#173d32]">
            A little about us <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative min-h-64 overflow-hidden rounded-[28px] sm:row-span-2 sm:min-h-[430px]">
            <Image
              src="/images/niyojan-entry.png"
              alt="Flower-covered entrance steps at Niyojan Resto"
              fill
              sizes="(min-width: 640px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative min-h-48 overflow-hidden rounded-[28px]">
            <Image
              src="/images/niyojan-exterior.png"
              alt="Niyojan Resto's decorated exterior"
              fill
              sizes="(min-width: 640px) 35vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex min-h-40 flex-col justify-center rounded-[28px] bg-[#efe8da] p-6 sm:p-7">
            <span className="font-display text-3xl text-[#a36f32]">Gather</span>
            <p className="mt-2 text-sm leading-6 text-[#657268]">Bring your appetite. There’s always space for one more.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:items-center lg:px-12">
        <div className="relative min-h-72 overflow-hidden rounded-[28px] sm:min-h-[390px]">
          <Image
            src="/images/niyojan-dining.png"
            alt="Warm lights and welcoming dining space inside Niyojan Resto"
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="py-3 md:px-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">A place to gather</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Good food tastes even better together.</h2>
          <p className="mt-4 text-sm leading-6 text-[#657268]">
            Step inside for a relaxed meal, a family celebration, or an evening around the table.
          </p>
          <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#8a5d2b] hover:text-[#173d32]">
            Plan your visit <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </section>

      <section className="bg-[#f0ebdf]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mb-9 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">A table for every occasion</p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">The little things make it special.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.number} className="rounded-[24px] bg-[#fbf8f1] p-6 sm:p-8">
                <span className="text-xs font-bold tracking-[0.15em] text-[#a36f32]">{item.number}</span>
                <h3 className="mt-6 font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#657268]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.1fr] md:items-center lg:px-12 lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">Find Niyojan Resto</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">See the place and plan your visit.</h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#657268]">
            Open our Google Maps listing to view the latest guest photos and videos, check directions, and learn more about the restaurant.
          </p>
          <a
            href="https://maps.app.goo.gl/1FY6EtxKv9L6Pwxp6"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white transition hover:bg-[#245848]"
          >
            View photos & videos on Google Maps <span aria-hidden="true" className="ml-2">↗</span>
          </a>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[#e9e1d3] bg-[#efe8da] shadow-[0_8px_24px_rgba(39,48,39,0.06)]">
          <iframe
            title="Map showing Hotel Niyojan Resto"
            src="https://maps.google.com/maps?q=18.6000528%2C73.7323364&z=16&output=embed"
            className="h-72 w-full sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12 lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">Your seat is waiting</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Come hungry. Leave happy.</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/our-menu" className="inline-flex min-h-12 items-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white hover:bg-[#245848]">See the menu</Link>
          <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full border border-[#cfc5b4] px-6 text-sm font-semibold hover:bg-[#efe8da]">Find us</Link>
        </div>
      </section>
    </PublicPage>
  );
}

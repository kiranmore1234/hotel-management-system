import Image from "next/image";
import Link from "next/link";
import { PublicPage } from "@/components/PublicSite";

const offerings = [
  {
    number: "01",
    title: "Dine in and unwind",
    text: "Settle into our welcoming dining space for a relaxed meal with friends, family, or colleagues.",
  },
  {
    number: "02",
    title: "Flavours for the table",
    text: "Explore a menu of restaurant favourites, regional dishes, and satisfying thalis prepared for sharing.",
  },
  {
    number: "03",
    title: "Gather for a special day",
    text: "Make room around the table for catch-ups, celebrations, and the everyday moments worth enjoying together.",
  },
];

export default function ServicePage() {
  return (
    <PublicPage>
      <section className="relative isolate flex min-h-[420px] items-end overflow-hidden bg-[#173d32] sm:min-h-[520px]">
        <Image
          src="/images/niyojan-dining.png"
          alt="Warm lights in the welcoming Niyojan Resto dining space"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#10291f]/85 via-[#10291f]/55 to-[#10291f]/10" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-14 text-white sm:px-8 sm:py-20 lg:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e5b76d]">Our service</p>
          <h1 className="mt-3 max-w-2xl font-display text-5xl font-semibold leading-tight sm:text-6xl">
            A warm welcome, every time.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
            Enjoy good food, thoughtful hospitality, and time well spent around the table at Niyojan Resto.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">Made for good company</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            A little more comfort. A lot to share.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#657268]">
            Join us for a leisurely dine-in meal or discover something new on the menu. Our team is here to make your visit welcoming and enjoyable.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/our-menu" className="inline-flex min-h-12 items-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white transition hover:bg-[#245848]">
              Explore the menu <span aria-hidden="true" className="ml-2">↗</span>
            </Link>
            <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full border border-[#cfc5b4] px-6 text-sm font-semibold transition hover:bg-[#efe8da]">
              Find us
            </Link>
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-[#efe8da] sm:min-h-[430px]">
          <Image
            src="/images/niyojan-signature-thali.png"
            alt="A signature thali served at Niyojan Resto"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="bg-[#efe8da]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-3 lg:px-12">
          {offerings.map((offering) => (
            <article key={offering.number} className="rounded-[24px] bg-[#fbf8f1] p-6 sm:p-8">
              <span className="text-xs font-bold tracking-[0.15em] text-[#a36f32]">{offering.number}</span>
              <h2 className="mt-5 font-display text-2xl font-semibold">{offering.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#657268]">{offering.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}

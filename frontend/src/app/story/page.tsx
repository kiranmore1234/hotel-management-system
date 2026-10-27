import Image from "next/image";
import Link from "next/link";
import { PublicPage } from "@/components/PublicSite";

export default function StoryPage() {
  return (
    <PublicPage>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a36f32]">Our story</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">A good meal has a way of bringing people closer.</h1>
          <p className="mt-6 text-base leading-7 text-[#657268]">
            Niyojan Resto is built around a simple idea: make people feel welcome, serve food worth sharing, and leave every table with a reason to come back.
          </p>
          <p className="mt-4 text-base leading-7 text-[#657268]">
            From the first hello to the last bite, we want your time here to feel easy, generous, and a little special.
          </p>
          <Link href="/our-menu" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white hover:bg-[#245848]">Discover the menu</Link>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[30px] bg-[#efe8da] sm:min-h-[520px]">
          <Image src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85" alt="Guests enjoying a relaxed restaurant meal" fill unoptimized sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
      </section>
      <section className="bg-[#efe8da]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-3 lg:px-12">
          {[
            ["Good ingredients", "We believe thoughtful food starts with ingredients treated with care."],
            ["Made to share", "Our table is for catching up, celebrating, and making room for everyone."],
            ["Warm service", "We look after the little details so you can enjoy the people around you."],
          ].map(([title, body], index) => (
            <article key={title} className="border-t border-[#cfc4b1] pt-5">
              <span className="text-xs font-bold tracking-[0.16em] text-[#a36f32]">0{index + 1}</span>
              <h2 className="mt-4 font-display text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#657268]">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}

import Image from "next/image";
import Link from "next/link";
import { PublicPage } from "@/components/PublicSite";

const values = [
  {
    number: "01",
    title: "Food worth sharing",
    text: "Familiar favourites, thoughtful flavours, and freshly prepared dishes made to bring everyone to the table.",
  },
  {
    number: "02",
    title: "A welcoming place",
    text: "From our decorated entrance to our warm dining space, we want every visit to feel relaxed and comfortable.",
  },
  {
    number: "03",
    title: "Hospitality from the heart",
    text: "Attentive, friendly service and care in the little details make a meal feel like a special occasion.",
  },
];

export default function AboutPage() {
  return (
    <PublicPage>
      <section className="bg-[#173d32] px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e5b76d]">About Niyojan</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-tight sm:text-6xl">
            Good food brings people closer.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Niyojan Resto is a place to share a meal, slow down, and enjoy warm hospitality in the heart of Hinjewadi, Pune.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:px-12">
        <div className="relative min-h-[340px] overflow-hidden rounded-[28px] sm:min-h-[480px]">
          <Image
            src="/images/niyojan-entry.png"
            alt="The welcoming flower-covered entrance at Niyojan Resto"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">A seat at our table</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Come as you are. There’s room to gather.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#657268]">
            Whether you are meeting friends, spending time with family, or stopping in for a favourite dish, we want your time here to feel easy, generous, and memorable.
          </p>
          <p className="mt-4 text-base leading-7 text-[#657268]">
            Thoughtful food and a warm welcome are at the heart of the Niyojan Resto experience.
          </p>
          <Link href="/service" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#173d32] px-6 text-sm font-semibold text-white transition hover:bg-[#245848]">
            Discover our service <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </section>

      <section className="bg-[#efe8da]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-3 lg:px-12">
          {values.map((value) => (
            <article key={value.number} className="border-t border-[#cfc4b1] pt-5">
              <span className="text-xs font-bold tracking-[0.16em] text-[#a36f32]">{value.number}</span>
              <h2 className="mt-4 font-display text-2xl font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#657268]">{value.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import LogoLink from "@/components/LogoLink";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us · Thrift Shoppers",
  description:
    "Thrift Shoppers by India Recycles. Handpicked preloved treasures and FMCG deals. Save money, reduce waste, discover daily.",
};

const values = [
  {
    title: "Mindful",
    text: "Every item here already exists. Choosing it means nothing new had to be made, packed, or shipped across the world.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4.97 0 9-4.03 9-9 0-4.632-3.5-8.448-8-8.945C8.5 2.552 5 6.368 5 11c0 .34.02.677.057 1.007C3.83 13.62 3 15.72 3 18v3h9z" opacity="0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.34 0 .675-.019 1.005-.056C15.62 20.17 17.72 21 20 21h1v-1c0-2.28-.83-4.38-2.056-5.995.037-.33.056-.665.056-1.005 0-4.97-4.03-9-9-9z" opacity="0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5C5 8 8 4 13.5 4c3 0 5.5 1.5 5.5 1.5S18 18 9.5 18C7 18 5 16 5 12.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19c2-4.5 5-7.5 9-9.5" />
      </svg>
    ),
  },
  {
    title: "Affordable",
    text: "Quality clothing, electronics, and daily essentials at a fraction of their original price. Good things should not cost the earth, in either sense.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h7.5a1.5 1.5 0 010 3H9m0-3v10m0-10H7m2 5h6a1.5 1.5 0 010 3H9m0 0H7m4 2v2m2-14v2" />
      </svg>
    ),
  },
  {
    title: "Circular",
    text: "Items come in, find new homes, and stay in use. What we sell funds what we recycle. Nothing good goes to waste on our watch.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0112.8-5.3l1.7 1.8m0 0V4m0 4.5H14.5m5 3.5a7.5 7.5 0 01-12.8 5.3L5 15.5m0 0V20m0-4.5H9.5" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <LogoLink />
          <Link
            href="/"
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-400 hover:text-emerald-700"
          >
            Back to shop
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-50" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-50" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            About Us
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Loved once.
            <br />
            <span className="text-emerald-700">Loved again.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Thrift Shoppers is the store of <strong className="text-ink">India Recycles</strong>,
            Ahmedabad. We rescue quality preloved items and surplus goods,
            check them with care, and pass them on at honest prices.
          </p>
        </div>
      </section>

      {/* Pull quote */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
        <blockquote className="border-l-2 border-emerald-600 pl-6 sm:pl-10">
          <p className="text-2xl font-medium leading-snug text-ink sm:text-3xl">
            The most sustainable product is the one that
            <span className="italic text-emerald-700"> already exists</span>.
          </p>
        </blockquote>
      </section>

      {/* Values */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            What we stand for
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {values.map((v, i) => (
              <div key={v.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  {v.icon}
                </div>
                <p className="mt-4 font-mono text-[10px] text-neutral-400">0{i + 1}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{v.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact strip */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
        <div className="rounded-3xl bg-ink px-6 py-10 text-center sm:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Every order counts
          </p>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-white sm:text-xl">
            One item bought here is one item saved from landfill,
            one box not manufactured, and one small win for the planet.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
          >
            Shop the collection
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Visit us */}
      <section className="mx-auto max-w-4xl px-4 pb-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Visit the store
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
                <span className="font-semibold text-ink">India Recycles</span>, Godown # 3,
                SK Estate, Nr Nagdev Mandir, LJ University Rd, Sarkhej - Gandhinagar Highway,
                Ahmedabad, Gujarat 382210
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/guide" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
                How shopping works →
              </Link>
              <a
                href="https://indiarecycles.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 underline-offset-4 hover:underline"
              >
                indiarecycles.org →
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4">
        <Footer />
      </div>
    </main>
  );
}

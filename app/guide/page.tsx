import type { Metadata } from "next";
import Link from "next/link";
import LogoLink from "@/components/LogoLink";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "How It Works · Thrift Shoppers",
  description:
    "How to shop at Thrift Shoppers by India Recycles. Browse, book, pay by UPI, and get it delivered or pick it up from the store.",
};

const steps = [
  {
    title: "Browse and add to cart",
    text: "New thrift finds and FMCG deals are added daily. If you love it, book it. If you wait, someone else might.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Checkout your way",
    text: "Choose home delivery anywhere in India, or pick up from our Ahmedabad store. Just your name, phone, and address. No account needed.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: "Pay with any UPI app",
    text: "Scan the QR shown after booking, or pay to our UPI ID directly. GPay, PhonePe, Paytm, anything works.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    title: "Send the screenshot",
    text: "WhatsApp us the payment screenshot with your Order ID. We confirm right away and pack your order.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    title: "Delivered, or collect it",
    text: "Delivery orders ship to your door. Pickup orders wait for you at the store, ready and packed.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
];

export default function GuidePage() {
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
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            How It Works
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            From <span className="text-emerald-700">spotted</span>
            <br />
            to <span className="text-emerald-700">yours</span> in five steps.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-600">
            No accounts, no apps to install. Just simple shopping the way it should be.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-2xl px-4 py-14 sm:py-16">
        <ol className="relative space-y-10 border-l border-dashed border-emerald-300 pl-8 sm:pl-10">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              {/* Node */}
              <span className="absolute -left-[49px] flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white font-mono text-xs font-semibold text-emerald-700 shadow-sm sm:-left-[59px] sm:h-10 sm:w-10">
                {i + 1}
              </span>
              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    {s.icon}
                  </span>
                  <h2 className="text-base font-semibold text-ink sm:text-lg">{s.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Good to know */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Good to know
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">One of a kind</p>
              <p className="mt-1.5 text-sm leading-relaxed text-emerald-800/80">
                Most items are single pieces. Once booked, they are gone, so do not sleep on a find.
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Checked with care</p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-800/80">
                Every product is inspected and photographed honestly. What you see is what arrives.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-5">
              <p className="text-sm font-semibold text-sky-900">Here to help</p>
              <p className="mt-1.5 text-sm leading-relaxed text-sky-800/80">
                Stuck anywhere? Call or WhatsApp us from the buttons below. A real person replies.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
            >
              Start shopping
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-neutral-400">
              Curious who we are? <Link href="/about" className="text-emerald-700 underline-offset-4 hover:underline">Read our story</Link>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4">
        <Footer />
      </div>
    </main>
  );
}

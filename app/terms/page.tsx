import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/StoreHeader";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions · Thrift Shoppers",
  description:
    "Terms & Conditions for Thrift Shoppers by India Recycles — delivery, store pickup, damaged items, size & fit, pre-loved products, product images, and availability.",
};

const STORE_WA = "917202035700";

const sections: { title: string; icon: string; points: string[]; note?: string }[] = [
  {
    title: "Delivery",
    icon: "🚚",
    points: [
      "Delivery charges are not included in the order value and will be calculated separately based on the delivery location.",
      "Charges of the selected delivery partner will apply and are to be paid directly to the delivery service provider.",
    ],
  },
  {
    title: "Store Pickup",
    icon: "🏬",
    points: [
      "Orders opted for pickup must be collected within 7 days of the order date.",
      "Orders not collected within this period will be returned to our inventory and will not be eligible for a refund.",
    ],
  },
  {
    title: "Damaged Items",
    icon: "📦",
    points: [
      "If you receive a damaged item, please notify us within 48 hours of receiving your order.",
      "Upon verification, we will be happy to process a refund or provide an appropriate resolution.",
    ],
  },
  {
    title: "Size & Fit",
    icon: "📏",
    points: [
      "If a clothing item does not fit, the customer is responsible for returning it to India Recycles.",
      "Any return shipping or courier charges will be borne by the customer.",
      "Once the item is received and verified, you may choose either a full refund or store credit of the same value to purchase another item from our website.",
    ],
  },
  {
    title: "Pre-Loved Products",
    icon: "♻️",
    points: [
      "Most clothing products listed on our website are pre-loved and have been carefully sorted and quality-checked by the India Recycles team.",
      "As these items have had a previous life, minor signs of wear or use may be present. Any significant imperfections will be clearly mentioned in the product description.",
    ],
  },
  {
    title: "Product Images",
    icon: "📷",
    points: [
      "We make every effort to ensure that product photographs and descriptions accurately represent each item.",
      "However, slight variations in colour or appearance may occur due to lighting during photography and differences in screen settings across devices.",
    ],
  },
  {
    title: "Product Availability",
    icon: "🏷️",
    points: [
      "Many of our products are one-of-a-kind or available in limited quantities. While we strive to keep our inventory updated, an order is considered confirmed only after it has been processed by our team.",
      "In the unlikely event that an item becomes unavailable after an order is placed, a full refund will be issued.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper">
      <StoreHeader />

      {/* Hero */}
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            The fine print
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            A few simple things to know about shopping with{" "}
            <strong className="text-ink">Thrift Shoppers by India Recycles</strong>. These
            cover delivery, pickup, returns, and the pre-loved nature of our products.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="space-y-4">
          {sections.map((s) => (
            <div
              key={s.title}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-neutral-50 px-5 py-3">
                <span className="text-lg" aria-hidden>
                  {s.icon}
                </span>
                <h2 className="text-base font-semibold text-ink">{s.title}</h2>
              </div>
              <ul className="list-disc space-y-2 px-5 py-4 pl-9 text-sm leading-relaxed text-neutral-600">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 rounded-2xl bg-ink px-6 py-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Contact Us
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white sm:text-base">
            If you have any questions regarding your order, delivery, returns, or products,
            please feel free to get in touch. Our team will be happy to assist you.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/${STORE_WA}?text=${encodeURIComponent(
                "Hi, I have a question about your Terms & Conditions."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
            >
              WhatsApp us
            </a>
            <a
              href="tel:+917202035700"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Call 72020 35700
            </a>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-xs font-medium text-emerald-300 underline-offset-4 hover:underline"
          >
            Back to shop
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4">
        <Footer />
      </div>
    </main>
  );
}

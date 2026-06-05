import Link from "next/link";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "SnapSell";

export default function SellerNav({ active }: { active: "sell" | "orders" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          {shopName}
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link
            href="/sell"
            className={`rounded-full px-3 py-1.5 ${
              active === "sell" ? "bg-brand text-white" : "text-neutral-600"
            }`}
          >
            Add
          </Link>
          <Link
            href="/orders"
            className={`rounded-full px-3 py-1.5 ${
              active === "orders" ? "bg-brand text-white" : "text-neutral-600"
            }`}
          >
            Orders
          </Link>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import LogoLink from "./LogoLink";

export function StoreHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <LogoLink />

        {/* Nav links */}
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink sm:block"
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink sm:block"
          >
            About Us
          </Link>
          <Link
            href="/guide"
            className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            How It Works
          </Link>
          {right}
        </nav>
      </div>
    </header>
  );
}

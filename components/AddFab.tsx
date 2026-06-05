import Link from "next/link";

// Floating "add a product" button, fixed bottom-right on admin pages.
export default function AddFab() {
  return (
    <Link
      href="/sell"
      aria-label="Add a product"
      className="fixed bottom-6 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
    >
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

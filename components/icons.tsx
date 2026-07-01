// Minimal Lucide-style line icons (24x24, currentColor). No emojis.
type P = { className?: string };
const base = "h-6 w-6";

export function CameraIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function ShirtIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.4 5.6 16 3l-1.5 1.5a3.5 3.5 0 0 1-5 0L8 3 3.6 5.6 6 10l2-1v11h8V9l2 1 2.4-4.4Z" />
    </svg>
  );
}

export function FoodIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v7a2 2 0 0 0 4 0V3M6 11v10M11 3c-1 1-1.5 2.5-1.5 4.5S10 21 11 21V3Z" />
      <path d="M18 3c-2 0-3 2.5-3 5s1 4 3 4M18 12v9" />
    </svg>
  );
}

export function ElectronicsIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function FurnitureIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5H1v-5a2 2 0 0 1 2-2Z" />
      <path d="M5 19v2M19 19v2" />
    </svg>
  );
}

export function CleaningIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3h3v3h-3zM11.5 6v2M8 8h7a1 1 0 0 1 1 1v3H7V9a1 1 0 0 1 1-1Z" />
      <rect x="7" y="12" width="9" height="9" rx="1.5" />
      <path d="M4 7l2-1M4 10l2-0.5" />
    </svg>
  );
}

export function JewelleryIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 3 3 4 3-4M7 3h10l3 4-8 9-8-9 3-4Z" />
      <path d="M4 7h16" />
    </svg>
  );
}

export function CosmeticsIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8.5" y="9" width="7" height="12" rx="1.5" />
      <path d="M10.5 9V5.5a1.5 1.5 0 0 1 3 0V9M12 3v2.5" />
    </svg>
  );
}

export function CheckIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-5 w-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function BagIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function BooksIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

import type { Category } from "@/lib/types";
export function CategoryIcon({ id, className = "h-8 w-8" }: { id: Category; className?: string }) {
  if (id === "apparel") return <ShirtIcon className={className} />;
  if (id === "food") return <FoodIcon className={className} />;
  if (id === "electronics") return <ElectronicsIcon className={className} />;
  if (id === "cleaning") return <CleaningIcon className={className} />;
  if (id === "jewellery") return <JewelleryIcon className={className} />;
  if (id === "cosmetics") return <CosmeticsIcon className={className} />;
  if (id === "books") return <BooksIcon className={className} />;
  return <FurnitureIcon className={className} />;
}

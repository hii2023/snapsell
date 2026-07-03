import type { Category } from "./types";

// The primary attribute differs per category. For electronics it is the device
// type (Laptop/Mobile/Other), which replaces a size choice.
export const SIZE_OPTIONS: Record<Category, string[]> = {
  apparel: ["S", "M", "L", "XL", "XXL", "Free"],
  food: ["100g", "250g", "500g", "1kg", "1 pc", "1 pack"],
  electronics: ["Laptop", "Mobile", "Other"],
  furniture: ["Small", "Medium", "Large", "Single", "Double", "Queen", "King"],
  cleaning: ["250ml", "500ml", "1L", "2L", "5L", "1 pc"],
  jewellery: ["Ring", "Necklace", "Earrings", "Bangle", "Chain", "Other"],
  cosmetics: ["Small", "30ml", "50ml", "100ml", "1 pc"],
  books: ["1 pc", "Set", "Other"],
  more: ["1 pc", "Small", "Medium", "Large", "Other"],
};

export const SIZE_LABEL: Record<Category, string> = {
  apparel: "Size",
  food: "Weight",
  electronics: "Type",
  furniture: "Size",
  cleaning: "Size",
  jewellery: "Type",
  cosmetics: "Size",
  books: "Type",
  more: "Type",
};

// Colour selection is intentionally off for every category for now.
export const HAS_COLOR: Record<Category, boolean> = {
  apparel: false,
  food: false,
  electronics: false,
  furniture: false,
  cleaning: false,
  jewellery: false,
  cosmetics: false,
  books: false,
  more: false,
};

export const COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Grey", hex: "#9ca3af" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Brown", hex: "#92400e" },
  { name: "Beige", hex: "#e7d8c0" },
];

// Per-category accent so the category screen is colourful and the chosen colour
// carries through the flow. Classes are full static strings so Tailwind keeps
// them (tailwind.config scans ./lib too).
export type Accent = {
  text: string;
  bg: string;
  ring: string;
  border: string;
  solid: string;
  solidText: string;
};

export const ACCENT: Record<Category, Accent> = {
  apparel: { text: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-400", border: "border-blue-500", solid: "bg-blue-600", solidText: "text-white" },
  food: { text: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-400", border: "border-orange-500", solid: "bg-orange-600", solidText: "text-white" },
  electronics: { text: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-400", border: "border-violet-500", solid: "bg-violet-600", solidText: "text-white" },
  furniture: { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-400", border: "border-amber-500", solid: "bg-amber-600", solidText: "text-white" },
  cleaning: { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-400", border: "border-emerald-500", solid: "bg-emerald-600", solidText: "text-white" },
  jewellery: { text: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-400", border: "border-rose-500", solid: "bg-rose-600", solidText: "text-white" },
  cosmetics: { text: "text-fuchsia-600", bg: "bg-fuchsia-50", ring: "ring-fuchsia-400", border: "border-fuchsia-500", solid: "bg-fuchsia-600", solidText: "text-white" },
  books: { text: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-400", border: "border-teal-500", solid: "bg-teal-600", solidText: "text-white" },
  more: { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-400", border: "border-slate-500", solid: "bg-slate-600", solidText: "text-white" },
};

export const CATEGORY_META: { id: Category; label: string }[] = [
  { id: "apparel", label: "Clothing" },
  { id: "food", label: "Food" },
  { id: "electronics", label: "Electronics" },
  { id: "furniture", label: "Furniture" },
  { id: "cleaning", label: "Cleaning" },
  { id: "jewellery", label: "Jewellery" },
  { id: "cosmetics", label: "Cosmetics" },
  { id: "books", label: "Books" },
  { id: "more", label: "More" },
];

// Categories where the seller can enter a custom size (e.g. 15ml, 650ml, 1.5L)
// on top of the presets, because pack sizes vary a lot for FMCG/food.
export const CUSTOM_SIZE_CATEGORIES: Category[] = ["food", "cleaning", "cosmetics"];
export const CUSTOM_SIZE_UNITS = ["ml", "L", "g", "kg", "pc"];

// Optional gender tag for clothing.
export const GENDERS = ["Men", "Women", "Unisex", "Kids"];

export const DEFAULT_PRICE_PRESETS = [49, 99, 199, 299, 499, 999];

// Pickup location for "Pickup" orders + give-away items.
export const PICKUP_ADDRESS =
  "India Recycles, Godown no. 3 SK Estate, Nr Nagdev mandir, Sarkhej - Gandhinagar Highway, LJ University Rd, Ahmedabad, Gujarat 382210";
export const PICKUP_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(PICKUP_ADDRESS);

// Delivery: free over this amount, otherwise a flat fee.
export const FREE_DELIVERY_ABOVE = 1000;
export const DELIVERY_FEE = 100;

export function deliveryFeeFor(itemsTotal: number, pickup: boolean): number {
  if (pickup || itemsTotal <= 0) return 0;
  return itemsTotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
}

export function rupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function categoryLabel(c: Category): string {
  return CATEGORY_META.find((m) => m.id === c)?.label ?? c;
}

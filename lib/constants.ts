import type { Category } from "./types";

// The primary "size" attribute differs per category. The label tells the seller
// what they are choosing (Size vs Weight vs Storage vs Dimensions).
export const SIZE_OPTIONS: Record<Category, string[]> = {
  apparel: ["S", "M", "L", "XL", "XXL", "Free"],
  food: ["100g", "250g", "500g", "1kg", "1 pc", "1 pack"],
  electronics: ["Small", "Medium", "Large", "32GB", "64GB", "128GB", "256GB"],
  furniture: ["Small", "Medium", "Large", "Single", "Double", "Queen", "King"],
};

export const SIZE_LABEL: Record<Category, string> = {
  apparel: "Size",
  food: "Weight",
  electronics: "Storage / size",
  furniture: "Size",
};

// Whether a colour choice makes sense for this category.
export const HAS_COLOR: Record<Category, boolean> = {
  apparel: true,
  food: false,
  electronics: true,
  furniture: true,
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

export const CATEGORY_META: { id: Category; label: string }[] = [
  { id: "apparel", label: "Clothing" },
  { id: "food", label: "Food" },
  { id: "electronics", label: "Electronics" },
  { id: "furniture", label: "Furniture" },
];

export const DEFAULT_PRICE_PRESETS = [99, 199, 299, 499, 999];

export function rupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function categoryLabel(c: Category): string {
  return CATEGORY_META.find((m) => m.id === c)?.label ?? c;
}

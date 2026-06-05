import type { Category } from "./types";

export const SIZE_OPTIONS: Record<Category, string[]> = {
  apparel: ["S", "M", "L", "XL", "XXL", "Free"],
  food: ["100g", "250g", "500g", "1kg", "1 pc", "1 pack"],
};

export const DEFAULT_PRICE_PRESETS = [99, 199, 299, 499, 999];

export function rupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function categoryLabel(c: Category): string {
  return c === "apparel" ? "Clothing" : "Food";
}

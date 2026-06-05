// SnapSell shares a Supabase project with other apps, so every object is
// namespaced with a snapsell_ prefix. Centralize the names here so the rest of
// the code never hardcodes them.
export const T = {
  products: "snapsell_products",
  orders: "snapsell_orders",
  orderItems: "snapsell_order_items",
  settings: "snapsell_settings",
} as const;

export const BUCKET = "snapsell-product-images";

export const RPC = {
  placeOrder: "snapsell_place_order",
  finalizeOnline: "snapsell_finalize_online_order",
} as const;

// PostgREST embed alias so the embedded items come back under `order_items`.
export const ORDER_WITH_ITEMS = `*, order_items:${T.orderItems}(*)`;

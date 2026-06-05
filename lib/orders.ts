import { supabaseServer } from "./supabase-server";
import { RPC } from "./db";

export type ItemInput = { product_id: string; qty: number };
export type CustomerInput = { name: string; phone: string; address: string };

function cleanItems(items: unknown): ItemInput[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => ({
      product_id: String((i as ItemInput).product_id || ""),
      qty: Math.round(Number((i as ItemInput).qty) || 0),
    }))
    .filter((i) => i.product_id && i.qty > 0);
}

// Calls the atomic place_order RPC (SECURITY DEFINER, anon-safe).
export async function placeOrder(args: {
  customer: CustomerInput;
  items: ItemInput[];
  paymentMode: "online" | "cod";
  paymentStatus: "pending" | "paid";
  fulfillment: "delivery" | "pickup";
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}): Promise<string> {
  const items = cleanItems(args.items);
  if (items.length === 0) throw new Error("Cart is empty");

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc(RPC.placeOrder, {
    p_customer_name: args.customer.name.trim(),
    p_phone: args.customer.phone.trim(),
    p_address: args.customer.address.trim(),
    p_payment_mode: args.paymentMode,
    p_payment_status: args.paymentStatus,
    p_razorpay_order_id: args.razorpayOrderId ?? null,
    p_razorpay_payment_id: args.razorpayPaymentId ?? null,
    p_fulfillment: args.fulfillment,
    p_items: items,
  });

  if (error) {
    if (error.message.includes("OUT_OF_STOCK")) {
      throw new Error("Some items just went out of stock. Please review your cart.");
    }
    throw new Error(error.message);
  }
  return data as string;
}

// Idempotently finalize an online order via the SECURITY DEFINER RPC. Safe to
// call from both the browser callback and the webhook.
export async function finalizeOnlineOrder(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  customer: CustomerInput;
  fulfillment: "delivery" | "pickup";
  items: ItemInput[];
}): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc(RPC.finalizeOnline, {
    p_razorpay_order_id: args.razorpayOrderId,
    p_razorpay_payment_id: args.razorpayPaymentId,
    p_customer_name: args.customer.name.trim(),
    p_phone: args.customer.phone.trim(),
    p_address: args.customer.address.trim(),
    p_fulfillment: args.fulfillment,
    p_items: cleanItems(args.items),
  });
  if (error) throw new Error(error.message);
}

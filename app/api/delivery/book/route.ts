import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { bookDelivery } from "@/lib/delivery";
import { T, ORDER_WITH_ITEMS } from "@/lib/db";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

// Seller books delivery for an order. Returns a ready-to-send message + link
// (manual adapter) or tracking (porter adapter), and marks the order booked.
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { order_id } = (await req.json()) as { order_id?: string };
  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: order, error } = await supabase
    .from(T.orders)
    .select(ORDER_WITH_ITEMS)
    .eq("id", order_id)
    .single();
  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const quote = await bookDelivery(order as unknown as Order);

  await supabase
    .from(T.orders)
    .update({
      delivery_provider: quote.provider,
      delivery_status: "booked",
      delivery_tracking: quote.tracking || null,
    })
    .eq("id", order_id);

  return NextResponse.json({ message: quote.message, link: quote.link });
}

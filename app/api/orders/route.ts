import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { T } from "@/lib/db";
import type { DeliveryStatus, PaymentStatus } from "@/lib/types";

export const runtime = "nodejs";

const DELIVERY: DeliveryStatus[] = [
  "unbooked",
  "booked",
  "out_for_delivery",
  "delivered",
];
const PAYMENT: PaymentStatus[] = ["pending", "paid", "failed"];

// Seller updates an order's delivery or payment status (e.g. mark COD collected,
// mark delivered).
export async function PATCH(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    delivery_status?: DeliveryStatus;
    payment_status?: PaymentStatus;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.delivery_status && DELIVERY.includes(body.delivery_status)) {
    patch.delivery_status = body.delivery_status;
  }
  if (body.payment_status && PAYMENT.includes(body.payment_status)) {
    patch.payment_status = body.payment_status;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(T.orders)
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

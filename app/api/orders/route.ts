import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { T } from "@/lib/db";
import type { DeliveryStatus, PaymentStatus, ReturnStatus, RefundStatus, PaymentMethod } from "@/lib/types";

export const runtime = "nodejs";

const DELIVERY: DeliveryStatus[] = [
  "unbooked",
  "booked",
  "out_for_delivery",
  "delivered",
];
const PAYMENT: PaymentStatus[] = ["pending", "paid", "failed"];
const RETURN: ReturnStatus[] = ["none", "requested", "accepted", "completed"];
const REFUND: RefundStatus[] = ["none", "requested", "completed"];

// Seller updates an order's delivery, payment, return, or refund status
export async function PATCH(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    delivery_status?: DeliveryStatus;
    payment_status?: PaymentStatus;
    return_status?: ReturnStatus;
    refund_status?: RefundStatus;
    refund_amount?: number;
    payment_method?: PaymentMethod;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.delivery_status && DELIVERY.includes(body.delivery_status)) {
    patch.delivery_status = body.delivery_status;
  }
  if (body.payment_status && PAYMENT.includes(body.payment_status)) {
    patch.payment_status = body.payment_status;
  }
  if (body.return_status && RETURN.includes(body.return_status)) {
    patch.return_status = body.return_status;
  }
  if (body.refund_status && REFUND.includes(body.refund_status)) {
    patch.refund_status = body.refund_status;
  }
  if (typeof body.refund_amount === "number" && body.refund_amount >= 0) {
    patch.refund_amount = body.refund_amount;
  }
  if (body.payment_method === "cash" || body.payment_method === "upi") {
    patch.payment_method = body.payment_method;
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
  revalidatePath("/orders");
  return NextResponse.json({ order: data });
}

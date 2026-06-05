import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { finalizeOnlineOrder } from "@/lib/orders";

export const runtime = "nodejs";

// Called from the browser after a successful Razorpay payment. Verifies the
// signature, then finalizes the order (idempotent with the webhook).
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    name?: string;
    phone?: string;
    address?: string;
    fulfillment?: "delivery" | "pickup";
    items?: { product_id: string; qty: number }[];
  };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const valid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  try {
    await finalizeOnlineOrder({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      customer: {
        name: body.name || "",
        phone: body.phone || "",
        address: body.address || "",
      },
      fulfillment: body.fulfillment === "pickup" ? "pickup" : "delivery",
      items: body.items || [],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not finalize order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

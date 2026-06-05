import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { finalizeOnlineOrder } from "@/lib/orders";

export const runtime = "nodejs";

// Backstop for the browser callback. Razorpay calls this on payment.captured.
// Reads cart + customer from the order notes and finalizes idempotently, so a
// paid order is never lost even if the buyer closes the tab.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          notes?: Record<string, string>;
        };
      };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;
  const notes = payment?.notes || {};

  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true, skipped: "no ids" });
  }

  let items: { product_id: string; qty: number }[] = [];
  try {
    items = JSON.parse(notes.items || "[]");
  } catch {
    items = [];
  }

  try {
    await finalizeOnlineOrder({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      customer: {
        name: notes.name || "",
        phone: notes.phone || "",
        address: notes.address || "",
      },
      items,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "finalize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

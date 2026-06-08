import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/lib/orders";

export const runtime = "nodejs";

// Cash on delivery: place the order immediately. Stock decrements atomically.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    phone?: string;
    address?: string;
    fulfillment?: "delivery" | "pickup";
    payment_mode?: "cod" | "qr";
    pickup_date?: string;
    pickup_time?: string;
    items?: unknown;
  };

  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
  const paymentMode = body.payment_mode === "cod" ? "cod" : "qr";
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "Missing details" }, { status: 400 });
  }
  if (fulfillment === "delivery" && !body.address) {
    return NextResponse.json({ error: "Address is required for delivery" }, { status: 400 });
  }
  if (fulfillment === "pickup" && (!body.pickup_date || !body.pickup_time)) {
    return NextResponse.json({ error: "Pickup date and time are required" }, { status: 400 });
  }

  try {
    const orderId = await placeOrder({
      customer: {
        name: body.name,
        phone: body.phone,
        address: fulfillment === "pickup" ? body.address || "Store pickup" : body.address!,
      },
      items: (body.items as { product_id: string; qty: number }[]) || [],
      paymentMode,
      paymentStatus: "pending",
      fulfillment,
      pickupDate: body.pickup_date || "",
      pickupTime: body.pickup_time || "",
    });
    return NextResponse.json({ order_id: orderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

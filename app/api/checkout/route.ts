import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/lib/orders";

export const runtime = "nodejs";

// Cash on delivery: place the order immediately. Stock decrements atomically.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    phone?: string;
    address?: string;
    items?: unknown;
  };

  if (!body.name || !body.phone || !body.address) {
    return NextResponse.json({ error: "Missing details" }, { status: 400 });
  }

  try {
    const orderId = await placeOrder({
      customer: { name: body.name, phone: body.phone, address: body.address },
      items: (body.items as { product_id: string; qty: number }[]) || [],
      paymentMode: "cod",
      paymentStatus: "pending",
    });
    return NextResponse.json({ order_id: orderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { razorpayClient, razorpayConfigured } from "@/lib/razorpay";
import { T } from "@/lib/db";

export const runtime = "nodejs";

// Creates a Razorpay order. Amount is computed server-side from DB prices, never
// trusted from the client. Cart + customer go into notes so the webhook can
// finalize the order even if the browser callback never fires.
export async function POST(req: NextRequest) {
  if (!razorpayConfigured()) {
    return NextResponse.json(
      { error: "Online payment is not set up yet" },
      { status: 400 }
    );
  }

  const body = (await req.json()) as {
    items?: { product_id: string; qty: number }[];
    name?: string;
    phone?: string;
    address?: string;
    fulfillment?: "delivery" | "pickup";
  };
  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";

  const items = (body.items || []).filter(
    (i) => i.product_id && Number(i.qty) > 0
  );
  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: products, error } = await supabase
    .from(T.products)
    .select("id, price, stock, name")
    .in(
      "id",
      items.map((i) => i.product_id)
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let amount = 0;
  for (const item of items) {
    const p = products?.find((x) => x.id === item.product_id);
    if (!p) return NextResponse.json({ error: "Product not found" }, { status: 400 });
    if (p.stock < item.qty) {
      return NextResponse.json(
        { error: `${p.name} is low on stock` },
        { status: 400 }
      );
    }
    amount += p.price * item.qty;
  }

  const rzp = razorpayClient();
  const order = await rzp.orders.create({
    amount: amount * 100, // paise
    currency: "INR",
    notes: {
      items: JSON.stringify(items),
      name: body.name || "",
      phone: body.phone || "",
      address: body.address || "",
      fulfillment,
    },
  });

  return NextResponse.json({
    razorpay_order_id: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}

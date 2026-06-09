import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";

export const runtime = "nodejs";

// Admin deletes ALL orders (no filter)
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const supabase = await supabaseServer();

    // Delete all order items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from("snapsell_order_items")
      .delete()
      .gt("id", ""); // Delete all by matching any non-empty id

    if (itemsError && itemsError.code !== "PGRST116") {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Delete all orders
    const { data: deleted, error: ordersError } = await supabase
      .from("snapsell_orders")
      .delete()
      .gt("id", "") // Delete all by matching any non-empty id
      .select("id");

    if (ordersError && ordersError.code !== "PGRST116") {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted?.length || 0,
      message: `Deleted ALL ${deleted?.length || 0} orders`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

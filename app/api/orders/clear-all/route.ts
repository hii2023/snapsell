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

    // Get count before deletion
    const { count: itemCount } = await supabase
      .from("snapsell_order_items")
      .select("*", { count: "exact", head: true });

    const { count: orderCount } = await supabase
      .from("snapsell_orders")
      .select("*", { count: "exact", head: true });

    // Delete all order items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from("snapsell_order_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Delete all orders
    const { error: ordersError } = await supabase
      .from("snapsell_orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const totalDeleted = (orderCount || 0) + (itemCount || 0);

    return NextResponse.json({
      success: true,
      deletedCount: orderCount || 0,
      message: `Deleted ALL ${orderCount || 0} orders and their items`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";

export const runtime = "nodejs";

// Admin clears all processed orders (non-unpaid orders)
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const supabase = await supabaseServer();

    // First, get all orders that are NOT unpaid to delete their items
    const { data: ordersToDelete } = await supabase
      .from("snapsell_orders")
      .select("id")
      .neq("payment_status", "pending");

    if (ordersToDelete && ordersToDelete.length > 0) {
      const orderIds = ordersToDelete.map((o) => o.id);

      // Delete order items for these orders
      await supabase
        .from("snapsell_order_items")
        .delete()
        .in("order_id", orderIds);
    }

    // Delete all non-unpaid orders
    const { data: deleted, error } = await supabase
      .from("snapsell_orders")
      .delete()
      .neq("payment_status", "pending")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted?.length || 0,
      message: `Deleted ${deleted?.length || 0} processed orders`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { redirect } from "next/navigation";
import { currentSeller } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T, ORDER_WITH_ITEMS } from "@/lib/db";
import type { Order, Product } from "@/lib/types";
import SellerNav from "@/components/SellerNav";
import OrdersClient from "@/components/OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!supabaseConfigured()) redirect("/login");
  const seller = await currentSeller();
  if (!seller) redirect("/login");

  const supabase = await supabaseServer();
  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from(T.orders)
      .select(ORDER_WITH_ITEMS)
      .order("created_at", { ascending: false }),
    supabase.from(T.products).select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <SellerNav active="orders" />
      <OrdersClient
        initialOrders={(orders as unknown as Order[]) || []}
        initialProducts={(products as Product[]) || []}
      />
    </>
  );
}

import { redirect } from "next/navigation";
import { currentSeller } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T, ORDER_WITH_ITEMS } from "@/lib/db";
import { DEFAULT_PRICE_PRESETS } from "@/lib/constants";
import type { Order, Product, Settings } from "@/lib/types";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!supabaseConfigured()) redirect("/login");
  const seller = await currentSeller();
  if (!seller) redirect("/login");

  const supabase = await supabaseServer();
  const [{ data: orders }, { data: products }, { data: row }] = await Promise.all([
    supabase.from(T.orders).select(ORDER_WITH_ITEMS).order("created_at", { ascending: false }),
    supabase.from(T.products).select("*").order("created_at", { ascending: false }),
    supabase.from(T.settings).select("*").eq("id", 1).single(),
  ]);

  const settings: Settings = {
    price_presets: Array.isArray(row?.price_presets) ? row.price_presets : DEFAULT_PRICE_PRESETS,
    upi_id: row?.upi_id ?? "",
    upi_name: row?.upi_name ?? "India Recycle",
    whatsapp_number: row?.whatsapp_number ?? "",
    pickup_address: row?.pickup_address ?? "",
    delivery_fee_amount: row?.delivery_fee_amount ?? 100,
    delivery_free_above: row?.delivery_free_above ?? 1000,
    extra_categories: Array.isArray(row?.extra_categories) ? row.extra_categories : [],
    subcats: row?.subcats && typeof row.subcats === "object" ? row.subcats : {},
  };

  return (
    <AdminShell
      settings={settings}
      initialOrders={(orders as unknown as Order[]) || []}
      initialProducts={(products as Product[]) || []}
    />
  );
}

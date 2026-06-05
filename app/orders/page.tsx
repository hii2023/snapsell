import { redirect } from "next/navigation";
import { currentSeller } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T, ORDER_WITH_ITEMS } from "@/lib/db";
import { DEFAULT_PRICE_PRESETS } from "@/lib/constants";
import type { Order, Product } from "@/lib/types";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!supabaseConfigured()) redirect("/login");
  const seller = await currentSeller();
  if (!seller) redirect("/login");

  const supabase = await supabaseServer();
  const [{ data: orders }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from(T.orders).select(ORDER_WITH_ITEMS).order("created_at", { ascending: false }),
    supabase.from(T.products).select("*").order("created_at", { ascending: false }),
    supabase.from(T.settings).select("price_presets").eq("id", 1).single(),
  ]);

  const presets =
    settings?.price_presets && Array.isArray(settings.price_presets)
      ? (settings.price_presets as number[])
      : DEFAULT_PRICE_PRESETS;

  return (
    <AdminShell
      pricePresets={presets}
      initialOrders={(orders as unknown as Order[]) || []}
      initialProducts={(products as Product[]) || []}
    />
  );
}

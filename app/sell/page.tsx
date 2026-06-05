import { redirect } from "next/navigation";
import { currentSeller } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import { DEFAULT_PRICE_PRESETS } from "@/lib/constants";
import SellForm from "@/components/SellForm";
import SellerNav from "@/components/SellerNav";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  if (!supabaseConfigured()) redirect("/login");
  const seller = await currentSeller();
  if (!seller) redirect("/login");

  // Load the seller's price presets and total product count.
  let presets = DEFAULT_PRICE_PRESETS;
  const supabase = await supabaseServer();
  const [{ data }, { count }] = await Promise.all([
    supabase.from(T.settings).select("price_presets").eq("id", 1).single(),
    supabase.from(T.products).select("id", { count: "exact", head: true }),
  ]);
  if (data?.price_presets && Array.isArray(data.price_presets)) {
    presets = data.price_presets as number[];
  }

  return (
    <>
      <SellerNav active="sell" />
      <SellForm pricePresets={presets} productCount={count ?? 0} />
    </>
  );
}

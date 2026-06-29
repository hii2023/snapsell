import { currentSeller } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import type { Product } from "@/lib/types";

export async function GET() {
  const seller = await currentSeller();
  if (!seller) return new Response("Unauthorized", { status: 401 });

  const supabase = await supabaseServer();
  const { data: products } = await supabase
    .from(T.products)
    .select("*")
    .order("created_at", { ascending: false });

  if (!products) {
    return new Response("No products found", { status: 404 });
  }

  // Build CSV in the format shown in your Excel
  const rows: string[] = [];
  rows.push(
    [
      "Code",
      "Name",
      "Category",
      "Subcategory",
      "Size",
      "Color",
      "Price",
      "MRP",
      "Stock",
      "Description",
      "Image URL",
      "Status",
    ].join("\t")
  );

  for (const p of products as Product[]) {
    rows.push(
      [
        p.code || "",
        p.name || "",
        p.category || "",
        p.subcategory || "",
        p.size || "",
        p.color || "",
        p.price || "",
        p.mrp || "",
        p.stock || "",
        p.description || "",
        p.image_url || "",
        p.is_active ? "Active" : "Inactive",
      ].join("\t")
    );
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products.csv"',
    },
  });
}

import * as XLSX from "xlsx";
import { currentSeller } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import { categoryLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Column headers exactly as required by the target CRM import template.
const HEADERS = [
  "Departments",
  "Category",
  "Sub Category",
  "Brand",
  "Sub Brand",
  "Item Code",
  "Product Name",
  "Print Name",
  "Short Description",
  "Description",
  "Measurement Name",
  "Measurement Code",
  "Hsn Code",
  "Sales Tax Name",
  "Sales Tax Rate",
  "Purchase Tax Name",
  "Purchase Tax Rate",
  "Sales taxIncludeing(Yes/No)",
  "Purchase taxIncludeing(Yes/No)",
  "Have Variant (Yes/No)",
  "Variant Name Seprated By /)",
  "MRP",
  "Purchase Price",
  "Discount Type(amount/percentage) default percentage",
  "Discount  default Zero",
  "Qty",
  "Net Weight UOM",
  "Net Weight",
  "Ingredients [Seprated by comma (,) ]",
  "Product Type (Finished,SemiFinished,Packaging,\nRaw)",
  "Wholesaler Discount Type",
  "Wholesaler Discount",
  "Retailer Discount Type",
  "Retailer Discount",
  "Online Price",
  "Minimum QTY",
  "Image Link",
  "Cess(Yes,No)",
  "Cess Rate",
  "Stock Limit",
  "PO Qty (Po Qty Must be Greater Than Stock limit)",
  "Manage Multiple Batch(Yes/NO)",
  "Has Expiry(Yes/No)",
  "Add Expiry Days",
  "Calculate Expiry On (MFG/EXP)",
  "EXP/MFG Date(DD-MM-YYYY)",
  "Is Expiry Product Saleable(Yes/No)?",
];

function rowFor(p: Product): (string | number)[] {
  const cat = categoryLabel(p.category);
  const mrp = p.mrp > 0 ? p.mrp : p.price;
  const onlinePrice = p.giveaway ? 0 : p.price;
  return [
    cat, // Departments
    cat, // Category
    p.subcategory || "", // Sub Category
    "", // Brand
    "", // Sub Brand
    p.code || "", // Item Code
    p.name || "", // Product Name
    p.name || "", // Print Name
    p.size || "", // Short Description
    p.description || "", // Description
    "Pcs", // Measurement Name
    "PCS", // Measurement Code
    "", // Hsn Code
    "", // Sales Tax Name
    "", // Sales Tax Rate
    "", // Purchase Tax Name
    "", // Purchase Tax Rate
    "", // Sales taxIncludeing
    "", // Purchase taxIncludeing
    "No", // Have Variant
    "", // Variant Name
    mrp, // MRP
    "", // Purchase Price
    "percentage", // Discount Type
    0, // Discount default Zero
    p.stock ?? 0, // Qty
    "", // Net Weight UOM
    "", // Net Weight
    "", // Ingredients
    "Finished", // Product Type
    "", // Wholesaler Discount Type
    "", // Wholesaler Discount
    "", // Retailer Discount Type
    "", // Retailer Discount
    onlinePrice, // Online Price
    "", // Minimum QTY
    p.image_url || "", // Image Link
    "No", // Cess
    0, // Cess Rate
    0, // Stock Limit
    "", // PO Qty
    "No", // Manage Multiple Batch
    "No", // Has Expiry
    "", // Add Expiry Days
    "", // Calculate Expiry On
    "", // EXP/MFG Date
    "", // Is Expiry Product Saleable
  ];
}

export async function GET() {
  const seller = await currentSeller();
  if (!seller) return new Response("Unauthorized", { status: 401 });

  const supabase = await supabaseServer();
  // All products — both in-stock and out-of-stock, active or not.
  const { data: products } = await supabase
    .from(T.products)
    .select("*")
    .order("created_at", { ascending: false });

  const list = (products as Product[]) || [];
  const aoa: (string | number)[][] = [HEADERS, ...list.map(rowFor)];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(buf);

  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-${date}.xlsx"`,
    },
  });
}

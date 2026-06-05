import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { T } from "@/lib/db";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";

// Create a product (seller-only, via authenticated session + RLS).
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    category?: Category;
    image_url?: string;
    size?: string;
    color?: string;
    price?: number;
    stock?: number;
  };

  const name = (body.name || "").trim();
  const valid: Category[] = ["apparel", "food", "electronics", "furniture"];
  const category: Category = valid.includes(body.category as Category)
    ? (body.category as Category)
    : "apparel";
  const price = Math.round(Number(body.price) || 0);
  const stock = Math.round(Number(body.stock) || 0);

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (price <= 0) return NextResponse.json({ error: "Price required" }, { status: 400 });
  if (stock <= 0) return NextResponse.json({ error: "Units required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(T.products)
    .insert({
      name,
      category,
      image_url: body.image_url || "",
      size: (body.size || "").trim(),
      color: (body.color || "").trim(),
      price,
      stock,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// Restock or toggle a product (seller-only).
export async function PATCH(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    stock?: number;
    is_active?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.stock === "number") patch.stock = Math.max(0, Math.round(body.stock));
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(T.products)
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

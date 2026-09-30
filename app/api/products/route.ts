import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { T } from "@/lib/db";
import type { ExtraCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/constants";

export const runtime = "nodejs";

// The nine built-ins plus whatever the owner added in the C-Panel. Read per
// request rather than hardcoded, so a category added in Settings is immediately
// usable here without a deploy. Anything not on this list is rejected, which is
// what keeps junk out of the column now that the DB no longer constrains it.
async function allowedCategories(): Promise<Set<string>> {
  const ids = new Set<string>(CATEGORY_META.map((c) => c.id));
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from(T.settings)
      .select("extra_categories")
      .eq("id", 1)
      .single();
    const extra = (data?.extra_categories as ExtraCategory[] | null) || [];
    for (const c of extra) if (c?.id) ids.add(c.id);
  } catch {
    // Settings unreadable: fall back to the built-ins rather than failing the save.
  }
  return ids;
}

// Create a product (seller-only, via authenticated session + RLS).
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    category?: string;
    subcategory?: string;
    image_url?: string;
    images?: string[];
    description?: string;
    size?: string;
    color?: string;
    gender?: string;
    price?: number;
    mrp?: number;
    giveaway?: boolean;
    stock?: number;
  };

  const name = (body.name || "").trim();
  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u)
    : [];
  const primary = images[0] || body.image_url || "";
  const allowed = await allowedCategories();
  const category = body.category && allowed.has(body.category) ? body.category : "apparel";
  const giveaway = Boolean(body.giveaway);
  const price = giveaway ? 0 : Math.round(Number(body.price) || 0);
  const stock = Math.round(Number(body.stock) || 0);

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!giveaway && price <= 0)
    return NextResponse.json({ error: "Price required" }, { status: 400 });
  if (stock <= 0) return NextResponse.json({ error: "Units required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(T.products)
    .insert({
      name,
      category,
      subcategory: (body.subcategory || "").trim(),
      image_url: primary,
      images: images.length ? images : primary ? [primary] : [],
      description: (body.description || "").trim(),
      size: (body.size || "").trim(),
      color: (body.color || "").trim(),
      gender: (body.gender || "").trim(),
      price,
      mrp: giveaway ? 0 : Math.max(0, Math.round(Number(body.mrp) || 0)),
      giveaway,
      stock,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// Delete a product (seller-only).
export async function DELETE(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.from(T.products).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Edit / restock / toggle a product (seller-only). All fields optional.
export async function PATCH(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    category?: string;
    subcategory?: string;
    images?: string[];
    description?: string;
    size?: string;
    color?: string;
    gender?: string;
    price?: number;
    mrp?: number;
    giveaway?: boolean;
    stock?: number;
    is_active?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.category) {
    const allowed = await allowedCategories();
    // A category deleted from Settings leaves its products behind. Editing one of
    // those must not 400 just because its category is no longer on the list, so an
    // unchanged value is always accepted — only a MOVE to an unknown one is refused.
    if (!allowed.has(body.category)) {
      const supabase = await supabaseServer();
      const { data: current } = await supabase
        .from(T.products)
        .select("category")
        .eq("id", body.id)
        .single();
      if (current?.category !== body.category) {
        return NextResponse.json({ error: "Unknown category" }, { status: 400 });
      }
    }
    patch.category = body.category;
  }
  if (typeof body.subcategory === "string") patch.subcategory = body.subcategory.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (Array.isArray(body.images)) {
    const imgs = body.images.filter((u) => typeof u === "string" && u);
    patch.images = imgs;
    patch.image_url = imgs[0] || "";
  }
  if (typeof body.size === "string") patch.size = body.size.trim();
  if (typeof body.color === "string") patch.color = body.color.trim();
  if (typeof body.gender === "string") patch.gender = body.gender.trim();
  if (typeof body.stock === "number") patch.stock = Math.max(0, Math.round(body.stock));
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  if (typeof body.giveaway === "boolean") {
    patch.giveaway = body.giveaway;
    if (body.giveaway) {
      patch.price = 0;
      patch.mrp = 0;
    }
  }
  if (!patch.giveaway && typeof body.price === "number") {
    patch.price = Math.max(0, Math.round(body.price));
  }
  if (patch.giveaway !== true && typeof body.mrp === "number") {
    patch.mrp = Math.max(0, Math.round(body.mrp));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

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

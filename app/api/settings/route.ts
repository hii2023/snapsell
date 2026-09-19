import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { T } from "@/lib/db";

export const runtime = "nodejs";

// Update shop settings / control panel (seller-only).
export async function PATCH(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.upi_id === "string") patch.upi_id = body.upi_id.trim();
  if (typeof body.upi_name === "string") patch.upi_name = body.upi_name.trim();
  if (typeof body.whatsapp_number === "string")
    patch.whatsapp_number = body.whatsapp_number.replace(/[^0-9]/g, "");
  if (typeof body.pickup_address === "string") patch.pickup_address = body.pickup_address.trim();
  if (typeof body.delivery_fee_amount === "number")
    patch.delivery_fee_amount = Math.max(0, Math.round(body.delivery_fee_amount));
  if (typeof body.delivery_free_above === "number")
    patch.delivery_free_above = Math.max(0, Math.round(body.delivery_free_above));
  if (Array.isArray(body.extra_categories)) patch.extra_categories = body.extra_categories;
  if (Array.isArray(body.price_presets)) patch.price_presets = body.price_presets;

  // subcats is a plain object { categoryId: ["Shirts", "Jeans"] }. Keep only
  // string arrays so a malformed client payload cannot corrupt the column.
  if (body.subcats && typeof body.subcats === "object" && !Array.isArray(body.subcats)) {
    const subcats: Record<string, string[]> = {};
    for (const [catId, list] of Object.entries(body.subcats as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const clean = list
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean);
      if (clean.length) subcats[catId] = Array.from(new Set(clean));
    }
    patch.subcats = subcats;
  }

  if (Array.isArray(body.wa_templates)) {
    const templates: { id: string; label: string; message: string }[] = [];
    for (const raw of body.wa_templates as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const t = raw as Record<string, unknown>;
      const id = String(t.id || "");
      if (!id) continue;
      templates.push({
        id,
        label: String(t.label || ""),
        message: String(t.message || ""),
      });
    }
    patch.wa_templates = templates;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(T.settings)
    .update(patch)
    .eq("id", 1)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

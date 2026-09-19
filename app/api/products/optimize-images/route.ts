import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { BUCKET, T } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_EDGE = 1400;
const WEBP_QUALITY = 80;

// One-off (and re-runnable) maintenance job that shrinks product photos which
// were uploaded before app/api/upload/route.ts started resizing. Originals are
// left untouched in the bucket; each product simply starts pointing at a new,
// much smaller .webp copy. Safe to stop and resume at any point.
//
// Seller-authenticated so it can run straight from the admin panel: storage
// INSERT is allowed for any signed-in user, so no service-role key is needed.

function publicPrefix(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${BUCKET}/`;
}

// Only touch our own bucket, and skip anything already converted.
function needsWork(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(publicPrefix()) &&
    !url.toLowerCase().endsWith(".webp")
  );
}

type Row = { id: string; image_url: string | null; images: unknown };

export async function GET() {
  const seller = await requireSeller();
  if (!seller.ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await supabaseServer();
  const { count, error } = await supabase
    .from(T.products)
    .select("id", { count: "exact", head: true })
    .not("image_url", "ilike", "%.webp")
    .neq("image_url", "");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 6, 1), 20);
  // Rows that cannot be converted (an image hosted outside our bucket, or a
  // download that keeps failing) stay in the pending set forever. The caller
  // walks past them with an offset instead of retrying the same batch.
  const offset = Math.max(Number(body.offset) || 0, 0);

  const supabase = await supabaseServer();

  const { data: rows, error: readErr } = await supabase
    .from(T.products)
    .select("id, image_url, images")
    .not("image_url", "ilike", "%.webp")
    .neq("image_url", "")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  let products = 0;
  let converted = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const row of (rows || []) as Row[]) {
    // Every distinct URL this product uses, converted once and reused across
    // both the main image and the gallery.
    const gallery = Array.isArray(row.images) ? row.images : [];
    const targets = Array.from(
      new Set([row.image_url, ...gallery].filter(needsWork) as string[])
    );

    const map = new Map<string, string>();
    for (const url of targets) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const input = Buffer.from(await res.arrayBuffer());

        const output = await sharp(input)
          .rotate()
          .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        const name = `${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(name, output, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "31536000",
          });
        if (upErr) throw new Error(upErr.message);

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
        map.set(url, data.publicUrl);

        bytesBefore += input.length;
        bytesAfter += output.length;
        converted += 1;
      } catch {
        failed += 1;
        // Leave this URL as-is; the product keeps working on the original.
      }
    }

    if (map.size === 0) continue;

    const nextMain = row.image_url && map.get(row.image_url) ? map.get(row.image_url)! : row.image_url;
    const nextGallery = gallery.map((u) =>
      typeof u === "string" && map.get(u) ? map.get(u)! : u
    );

    const { error: updErr } = await supabase
      .from(T.products)
      .update({ image_url: nextMain, images: nextGallery })
      .eq("id", row.id);

    if (updErr) failed += 1;
    else products += 1;
  }

  const { count } = await supabase
    .from(T.products)
    .select("id", { count: "exact", head: true })
    .not("image_url", "ilike", "%.webp")
    .neq("image_url", "");

  const scanned = (rows || []).length;
  return NextResponse.json({
    scanned,
    products,
    converted,
    failed,
    // Fixed rows drop out of the pending set, so only the ones we skipped
    // should push the window forward.
    nextOffset: offset + (scanned - products),
    remaining: count ?? 0,
    savedKB: Math.round((bytesBefore - bytesAfter) / 1024),
  });
}

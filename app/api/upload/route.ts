import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { BUCKET } from "@/lib/db";

export const runtime = "nodejs";

// Longest edge we keep. Comfortably sharp on a phone and in the product
// gallery's fullscreen view, while cutting a typical 700KB-2MB camera shot to
// well under 150KB.
const MAX_EDGE = 1400;
const WEBP_QUALITY = 80;

// Uploads a product photo to Supabase Storage and returns its public URL.
//
// Photos are resized and re-encoded to WebP HERE, once, so the storefront can
// serve them directly. Storing full resolution originals is what forced every
// product image through Vercel's metered optimizer, and when that quota ran
// out the whole catalogue went blank. Small files at rest means no optimizer.
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 25MB)" }, { status: 400 });
  }

  try {
    const original = Buffer.from(await file.arrayBuffer());

    let buffer = original;
    let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    let contentType = file.type || "image/jpeg";

    try {
      buffer = await sharp(original)
        .rotate() // honour EXIF orientation before we discard the metadata
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      ext = "webp";
      contentType = "image/webp";
    } catch {
      // Unreadable or exotic format: fall back to storing what was sent rather
      // than failing the seller's upload.
    }

    const name = `${crypto.randomUUID()}.${ext}`;
    const supabase = await supabaseServer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, buffer, { contentType, upsert: false, cacheControl: "31536000" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

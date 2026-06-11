import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { BUCKET } from "@/lib/db";

export const runtime = "nodejs";

// Uploads a product photo to Supabase Storage and returns its public URL.
// Converts images to WebP format for optimal size and performance.
// Uses the authenticated seller session (RLS allows authenticated inserts).
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
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(buffer))
      .webp({ quality: 80 })
      .toBuffer();

    const name = `${crypto.randomUUID()}.webp`;
    const supabase = await supabaseServer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, webpBuffer, { contentType: "image/webp", upsert: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

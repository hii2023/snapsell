import { NextRequest, NextResponse } from "next/server";
import { readProductPhoto } from "@/lib/anthropic";
import { requireSeller } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// Reads a product photo with Claude vision and returns name + category + size.
export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as { base64?: string; mediaType?: string };
  if (!body.base64 || !body.mediaType) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  try {
    const result = await readProductPhoto(body.base64, body.mediaType);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

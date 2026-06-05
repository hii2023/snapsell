import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Same-origin proxy for product images so the client can fetch them as a blob
// (and attach them to a WhatsApp share) without cross-origin/CORS problems.
// Restricted to this project's Supabase storage to avoid being an open proxy.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!base || !url.startsWith(`${base}/storage/`)) {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

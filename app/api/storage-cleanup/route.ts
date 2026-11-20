import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireSeller } from "@/lib/auth";
import { BUCKET, T } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

// "Free up storage" for the thrift store's photo bucket ONLY.
//
// The photo optimizer left every full-size original in the bucket after
// pointing products at small .webp copies. This removes files that nothing
// uses any more. A file is KEPT if any of these still points at it:
//   - a product's main photo or gallery (sold or not)
//   - an order line's photo snapshot (admin order history)
// plus anything uploaded in the last 7 days, so a photo taken for a product
// that has not been saved yet is never lost.
//
// Scoped by construction to BUCKET (snapsell-product-images). The website's
// `site-images` bucket lives in the same Supabase project and is never
// listed, read or touched here. The storage delete policy (migration 0015)
// is pinned to this bucket as well.

const KEEP_RECENT_DAYS = 7;
const PAGE = 1000;

type Obj = { name: string; size: number; createdAt: number };

function nameFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const rest = url.slice(i + marker.length).split("?")[0].split("#")[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

type Supa = Awaited<ReturnType<typeof supabaseServer>>;

async function listBucket(supabase: Supa): Promise<Obj[]> {
  const out: Obj[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    for (const f of data || []) {
      // Folder placeholders come back with id null; every product photo is a
      // file at the bucket root.
      if (!f.id) continue;
      out.push({
        name: f.name,
        size: Number((f.metadata as { size?: number } | null)?.size) || 0,
        createdAt: f.created_at ? Date.parse(f.created_at) : Date.now(),
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function referencedNames(supabase: Supa): Promise<Set<string>> {
  const keep = new Set<string>();
  const add = (u: unknown) => {
    const n = nameFromUrl(u);
    if (n) keep.add(n);
  };

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(T.products)
      .select("id, image_url, images")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const p of data || []) {
      add(p.image_url);
      if (Array.isArray(p.images)) p.images.forEach(add);
    }
    if (!data || data.length < PAGE) break;
  }

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(T.orderItems)
      .select("id, image_url_snapshot")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const it of data || []) add(it.image_url_snapshot);
    if (!data || data.length < PAGE) break;
  }

  return keep;
}

async function scan(supabase: Supa) {
  const [objects, keep] = await Promise.all([listBucket(supabase), referencedNames(supabase)]);
  // Safety net: if the reference lookup came back empty (an RLS or session
  // problem), treat it as an error instead of "everything is unused".
  if (keep.size === 0) throw new Error("Could not read product photos. Nothing was deleted.");

  const cutoff = Date.now() - KEEP_RECENT_DAYS * 86400000;
  const removable = objects.filter((o) => !keep.has(o.name) && o.createdAt < cutoff);
  const sum = (a: Obj[]) => a.reduce((t, o) => t + o.size, 0);
  return {
    objects,
    removable,
    totalFiles: objects.length,
    totalMB: +(sum(objects) / 1048576).toFixed(1),
    removableFiles: removable.length,
    removableMB: +(sum(removable) / 1048576).toFixed(1),
  };
}

export async function GET() {
  const seller = await requireSeller();
  if (!seller.ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const supabase = await supabaseServer();
    const r = await scan(supabase);
    return NextResponse.json({
      totalFiles: r.totalFiles,
      totalMB: r.totalMB,
      removableFiles: r.removableFiles,
      removableMB: r.removableMB,
      afterMB: +(r.totalMB - r.removableMB).toFixed(1),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Scan failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller.ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const supabase = await supabaseServer();

  try {
    // Step 1 (run once per cleanup): move old order thumbnails onto the
    // product's current .webp photo so their originals become unused too.
    if (body.action === "repoint") {
      const { data, error } = await supabase.rpc("snapsell_repoint_order_snapshots");
      if (error) throw new Error(error.message);
      return NextResponse.json({ repointed: data ?? 0 });
    }

    // Step 2 (looped by the admin page): delete one batch. The unused list is
    // recomputed every call, so a product saved mid-run is respected.
    if (body.action === "delete") {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
      const r = await scan(supabase);
      const batch = r.removable.slice(0, limit);
      if (batch.length === 0) {
        return NextResponse.json({ deleted: 0, freedMB: 0, remaining: 0, afterMB: r.totalMB });
      }
      const { data, error } = await supabase.storage.from(BUCKET).remove(batch.map((o) => o.name));
      if (error) throw new Error(error.message);
      // remove() returns only the files it actually deleted; with no delete
      // permission it silently returns [] instead of an error.
      const gone = new Set((data || []).map((d) => d.name));
      if (gone.size === 0) {
        throw new Error("Storage refused the delete. Make sure you are signed in with a staff (@snapsell.app) account.");
      }
      const freed = batch.filter((o) => gone.has(o.name)).reduce((t, o) => t + o.size, 0);
      return NextResponse.json({
        deleted: gone.size,
        freedMB: +(freed / 1048576).toFixed(1),
        remaining: r.removableFiles - gone.size,
        afterMB: +((r.totalMB * 1048576 - freed) / 1048576).toFixed(1),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Cleanup failed" }, { status: 500 });
  }
}

import { supabaseConfigured } from "./supabase";
import { supabaseServer } from "./supabase-server";

// The Supabase project is shared with other apps, so "any authenticated user"
// is not enough. Staff are identified two ways:
//   1. Any account on the shop's own domain (@snapsell.app). New staff are
//      created in Supabase Auth as <name>@snapsell.app, so adding a seller
//      needs no code or env change — just create the user in Supabase.
//   2. Any extra email listed in SELLER_EMAIL (for the rare outside address).
const SELLER_DOMAIN = "@snapsell.app";

function isSeller(email: string | undefined): boolean {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  if (e.endsWith(SELLER_DOMAIN)) return true;
  const allowed = (process.env.SELLER_EMAIL || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(e);
}

export async function requireSeller(): Promise<
  { ok: true; userId: string } | { ok: false }
> {
  if (!supabaseConfigured()) return { ok: false };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSeller(user.email)) return { ok: false };
  return { ok: true, userId: user.id };
}

export async function currentSeller() {
  if (!supabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSeller(user.email)) return null;
  return user;
}

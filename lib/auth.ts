import { supabaseConfigured } from "./supabase";
import { supabaseServer } from "./supabase-server";

// The Supabase project is shared with other apps, so "any authenticated user"
// is not enough: only the configured seller email counts as the shop owner.
// If SELLER_EMAIL is unset, any authenticated user is treated as the seller
// (fine for a dedicated project).
function isSeller(email: string | undefined): boolean {
  const allowed = (process.env.SELLER_EMAIL || "").trim().toLowerCase();
  if (!allowed) return true;
  return (email || "").trim().toLowerCase() === allowed;
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

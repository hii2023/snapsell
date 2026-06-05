import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Browser client (anon key, respects RLS). Safe to import in client components.
// SnapSell needs no service-role key: seller writes go through the authenticated
// session and public writes go through SECURITY DEFINER RPCs.
export function supabaseBrowser() {
  return createBrowserClient(url, anonKey);
}

export function supabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

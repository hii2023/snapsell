import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Subdomain → path mapping for custom domains:
//   admin.indiarecycles.org  →  rewrites root to /orders, otherwise passes through
//   store.indiarecycles.org  →  blocks admin paths, passes through the rest
function subdomainRewrite(req: NextRequest): NextResponse | null {
  const hostname = req.headers.get("host") || "";
  const pathname = req.nextUrl.pathname;

  if (hostname.startsWith("admin.indiarecycles.org")) {
    // Only rewrite the root path. All other paths (including /orders, /sell,
    // /login, /auth, /api, etc.) pass through untouched so they render the
    // real Next.js route. Previously we rewrote anything not in a skip list
    // which sent /login → /orders/login (404).
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/orders";
      return NextResponse.rewrite(url);
    }
    return null;
  }

  if (hostname.startsWith("store.indiarecycles.org")) {
    // Block access to admin paths from the store subdomain
    if (pathname.startsWith("/orders") || pathname.startsWith("/sell")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return null;
}

// Refreshes the Supabase auth session on every request so server components
// and route handlers see a valid user. No-op when Supabase is not configured.
export async function middleware(req: NextRequest) {
  // Subdomain routing first
  const rewrite = subdomainRewrite(req);
  if (rewrite) return rewrite;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};

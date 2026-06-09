import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Subdomain → path mapping for custom domains:
//   admin.indiarecycles.org  →  /orders  (admin dashboard)
//   store.indiarecycles.org  →  /        (customer shop)
function subdomainRewrite(req: NextRequest): NextResponse | null {
  const hostname = req.headers.get("host") || "";
  const pathname = req.nextUrl.pathname;

  if (hostname.startsWith("admin.indiarecycles.org")) {
    // Already on an /orders path — don't double-rewrite
    if (pathname.startsWith("/orders") || pathname.startsWith("/sell") || pathname.startsWith("/auth") || pathname.startsWith("/api")) {
      return null;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/orders" + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
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

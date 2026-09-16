import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { rememberCookie, sessionCookieOptions } from "@/lib/supabase/cookies";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const protectedRoute = /^\/credit-(analyst|investigator)(\/|$)/.test(request.nextUrl.pathname);

  function loginRedirect() {
    const redirect = NextResponse.redirect(new URL("/log-in", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  if (!isSupabaseConfigured()) return protectedRoute ? loginRedirect() : response;
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, sessionCookieOptions(options, request.cookies.get(rememberCookie)?.value));
        });
        response.headers.set("Cache-Control", "private, no-store");
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if (protectedRoute && (error || !data?.claims)) return loginRedirect();
  return response;
}

export const config = {
  matcher: ["/log-in", "/forgot-password", "/reset-password", "/auth/:path*", "/credit-analyst/:path*", "/credit-investigator/:path*"],
};

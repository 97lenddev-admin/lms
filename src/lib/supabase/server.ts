import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import { rememberCookie, sessionCookieOptions } from "./cookies";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, sessionCookieOptions(options, cookieStore.get(rememberCookie)?.value));
          });
        } catch {
          // Server Components cannot write cookies. Proxy persists refreshes.
        }
      },
    },
  });
}

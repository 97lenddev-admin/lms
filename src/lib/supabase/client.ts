import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import { rememberCookie, sessionCookieOptions } from "./cookies";

export function setRememberMe(remember: boolean) {
  const rememberUntil = remember ? String(Date.now() + 30 * 86400 * 1000) : "";
  const { url } = getSupabaseConfig();
  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const sessionCookies = parseCookieHeader(document.cookie).filter(({ name }) =>
    name === storageKey || (name.startsWith(`${storageKey}.`) && /^\d+$/.test(name.slice(storageKey.length + 1))),
  );
  document.cookie = serializeCookieHeader(rememberCookie, rememberUntil, {
    path: "/", sameSite: "lax", maxAge: remember ? 30 * 86400 : 0,
    secure: window.location.protocol === "https:",
  });
  // Sign-in has already written the tokens. Apply the lifetime only after success.
  sessionCookies.forEach(({ name, value }) => {
    document.cookie = serializeCookieHeader(name, value ?? "", sessionCookieOptions({
      path: "/", sameSite: "lax", secure: window.location.protocol === "https:",
    }, rememberUntil));
  });
}

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key, {
    cookies: {
      getAll: () => parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" })),
      setAll(cookiesToSet) {
        const rememberUntil = parseCookieHeader(document.cookie).find(({ name }) => name === rememberCookie)?.value;
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeCookieHeader(name, value, sessionCookieOptions(options, rememberUntil));
        });
      },
    },
  });
}

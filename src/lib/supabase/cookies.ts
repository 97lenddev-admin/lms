import type { CookieOptions } from "@supabase/ssr";

export const rememberCookie = "lms-remember-until";

// Keep the original expiry when tokens refresh; do not extend the 30 days.
export function sessionCookieOptions(options: CookieOptions, rememberUntil?: string): CookieOptions {
  if (options.maxAge === 0) return options;
  const expiresAt = Number(rememberUntil);
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    return { ...options, expires: new Date(expiresAt), maxAge: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) };
  }
  return { ...options, maxAge: undefined, expires: undefined };
}

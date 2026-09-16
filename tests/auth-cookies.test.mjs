import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { sessionCookieOptions } from "../src/lib/supabase/cookies.ts";

test("remember checkbox writes a 30-day preference and unchecking removes it", () => {
  const now = 1800000000000;
  const document = { cookie: "" };
  const exports = {};
  const source = readFileSync(new URL("../src/lib/supabase/client.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: (name) => {
      if (name === "@supabase/ssr") return { parseCookieHeader, serializeCookieHeader };
      if (name === "./cookies") return { rememberCookie: "lms-remember-until", sessionCookieOptions };
      if (name === "./config") return { getSupabaseConfig: () => ({ url: "https://test.supabase.co" }) };
      throw new Error(`Unexpected import: ${name}`);
    },
    document,
    URL,
    window: { location: { protocol: "https:" } },
    Date: { now: () => now },
  });
  exports.setRememberMe(true);
  assert.match(document.cookie, new RegExp(`lms-remember-until=${now + 2592000000}`));
  assert.match(document.cookie, /Max-Age=2592000/i);
  assert.match(document.cookie, /Secure/i);
  assert.match(document.cookie, /SameSite=Lax/i);
  const options = sessionCookieOptions({ maxAge: 31536000 }, String(Date.now() + 2592000000));
  assert.ok(options.maxAge <= 2592000 && options.maxAge > 2591990);
  exports.setRememberMe(false);
  assert.match(document.cookie, /lms-remember-until=;/);
  assert.match(document.cookie, /Max-Age=0/i);
  document.cookie = "sb-test-auth-token.0=token-part";
  exports.setRememberMe(true);
  assert.match(document.cookie, /^sb-test-auth-token\.0=token-part;/);
  assert.ok(document.cookie.includes(`Expires=${new Date(now + 2592000000).toUTCString()}`));
  document.cookie = "sb-test-auth-token=token";
  exports.setRememberMe(false);
  assert.match(document.cookie, /^sb-test-auth-token=token;/);
  assert.doesNotMatch(document.cookie, /Max-Age|Expires/i);
});

test("unchecked remember uses session cookies even when Supabase supplies a lifetime", () => {
  const options = sessionCookieOptions({ path: "/", sameSite: "lax", maxAge: 31536000, expires: new Date() });
  assert.equal(options.maxAge, undefined);
  assert.equal(options.expires, undefined);
  assert.equal(options.sameSite, "lax");
});

test("refreshing tokens does not extend the original remember expiry", () => {
  const expiry = Date.now() + 86400000;
  const options = sessionCookieOptions({ maxAge: 31536000 }, String(expiry));
  assert.equal(options.expires.getTime(), expiry);
  assert.ok(options.maxAge <= 86400 && options.maxAge > 86390);
});

test("expired remember sessions expire newly refreshed cookies", () => {
  assert.equal(sessionCookieOptions({ maxAge: 31536000 }, String(Date.now() - 1000)).maxAge, 0);
});

test("sign-out cookie deletion is preserved", () => {
  const deletion = { maxAge: 0, path: "/" };
  assert.deepEqual(sessionCookieOptions(deletion, String(Date.now() + 86400000)), deletion);
});

test("malformed remember preference falls back to session cookies", () => {
  assert.equal(sessionCookieOptions({ maxAge: 31536000 }, "invalid").maxAge, undefined);
});

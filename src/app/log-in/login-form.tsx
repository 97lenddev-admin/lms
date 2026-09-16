"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient, setRememberMe } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (authError) {
        setError(authError.code === "invalid_credentials"
          ? "Incorrect email or password."
          : authError.code === "email_not_confirmed"
            ? "Please confirm your email before signing in."
            : "Unable to sign in. Please try again.");
        return;
      }
      setRememberMe(form.get("remember") === "on");
      router.replace("/credit-analyst");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again or contact your administrator.");
    } finally {
      setPending(false);
    }
  }

  return (
            <form onSubmit={handleSubmit} aria-busy={pending} className="flex w-full flex-col gap-6">
              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5 text-sm font-medium leading-5 text-[#404040]">
                  Email
                  <input
                    className="h-11 rounded-lg border border-[#d4d4d4] bg-white px-3.5 text-base font-normal leading-6 text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-[#737373] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/15"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    required
                  />
                </label>

                <div className="flex flex-col gap-1.5 text-sm font-medium leading-5 text-[#404040]">
                  <label htmlFor="login-password">Password</label>
                  <div className="relative">
                  <input
                    id="login-password"
                    className="h-11 w-full rounded-lg border border-[#d4d4d4] bg-white pl-3.5 pr-12 text-base font-normal leading-6 text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-[#737373] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/15"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-controls="login-password"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#737373] hover:text-[#404040] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
                  >
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c7 0 10 7 10 7a16 16 0 0 1-3.1 4.2M6.2 6.2C3.4 8.1 2 12 2 12s3 7 10 7a10.8 10.8 0 0 0 5.8-1.8" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm font-medium leading-5">
                <label className="flex min-w-0 items-center gap-2 text-[#404040]">
                  <input
                    className="size-4 shrink-0 appearance-none rounded border border-[#d4d4d4] bg-white checked:border-[#e11d48] checked:bg-[#e11d48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
                    type="checkbox"
                    name="remember"
                  />
                  <span>Remember for 30 days</span>
                </label>

                <Link
                  href="/forgot-password"
                  className="shrink-0 font-semibold text-[#be123c] hover:text-[#9f1239] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
                >
                  Forgot password
                </Link>
              </div>

              {error && <p role="alert" className="text-sm text-[#be123c]">{error}</p>}
              <button
                className="flex h-11 w-full items-center justify-center rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-base font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
                type="submit" disabled={pending}
              >
                {pending ? "Signing in…" : "Sign in"}
              </button>
            </form>
  );
}

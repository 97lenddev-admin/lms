"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient, setRememberMe } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authError.code === "weak_password" ? "Choose a stronger password that meets your organization's password policy."
          : authError.code === "same_password" ? "Choose a password different from your current password."
          : "Unable to update your password. Try again or request a new reset link.");
        return;
      }
      // The password is already changed even if revoking the local session fails.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      setRememberMe(false);
      setComplete(true);
      if (signOutError) setError("Your password was changed, but you are still signed in. Please sign out from your dashboard.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-8 text-center">
      <header className="flex flex-col items-center gap-6">
        <div className="flex size-12 items-center justify-center rounded-[10px] border border-[#d4d4d4] shadow-sm">
          <Image src="/forgot-password/key.svg" alt="" width={24} height={24} />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{complete ? "Password updated" : "Set a new password"}</h1>
          <p className="text-base text-[#525252]">{complete ? "You can now log in with your new password." : "Choose a new password with at least 8 characters."}</p>
        </div>
      </header>
      {!complete && <form onSubmit={handleSubmit} aria-busy={pending} className="flex w-full flex-col gap-5">
        {[{ name: "password", label: "New password" }, { name: "confirmPassword", label: "Confirm password" }].map(({ name, label }) => (
          <label key={name} className="flex flex-col gap-1.5 text-left text-sm font-medium text-[#404040]">
            {label}
            <input name={name} type="password" autoComplete="new-password" required minLength={8} className="h-11 rounded-lg border border-[#d4d4d4] px-3.5 text-base font-normal outline-none focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/15" />
          </label>
        ))}
        <button disabled={pending} type="submit" className="h-11 rounded-lg bg-[#e11d48] px-4 font-semibold text-white hover:bg-[#be123c] disabled:opacity-60">{pending ? "Saving…" : "Save new password"}</button>
      </form>}
      {error && <p role="alert" className="text-sm text-[#be123c]">{error}</p>}
      {!complete && <Link href="/forgot-password" className="text-sm font-semibold text-[#be123c]">Request a new reset link</Link>}
      <Link href="/log-in" className="text-sm font-semibold text-[#525252]">Back to log in</Link>
    </div>
  );
}

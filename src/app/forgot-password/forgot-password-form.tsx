"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function FeaturedIcon({ type }: { type: "key" | "mail" }) {
  return (
    <div className="flex size-12 items-center justify-center overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)]">
      <Image
        src={`/forgot-password/${type}.svg`}
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
    </div>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/log-in"
      className="flex items-center justify-center gap-1 text-sm font-semibold leading-5 text-[#525252] hover:text-[#171717] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
    >
      <Image
        src="/forgot-password/arrow-left.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden="true"
      />
      Back to log in
    </Link>
  );
}

const primaryButton =
  "flex h-11 w-full items-center justify-center rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-base font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]";

export default function ForgotPasswordForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(invalidLink ? "This reset link is invalid or expired. Request a new link and open it in the same browser." : "");
  const [notice, setNotice] = useState("");

  async function sendReset(email: string) {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (authError) {
        setError(authError.status === 429 ? "Please wait a minute before requesting another link." : "Unable to send reset instructions. Please try again.");
        return;
      }
      setSubmittedEmail(email);
      setNotice("If an account exists for this email, reset instructions will arrive shortly. Open the link in this browser.");
    } catch {
      setError("Unable to connect. Please try again or contact your administrator.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    await sendReset(String(data.get("email") ?? "").trim());
  }

  if (submittedEmail) {
    return (
      <div className="flex w-full max-w-[360px] flex-col items-center gap-8 text-center">
        <header className="flex w-full flex-col items-center gap-6">
          <FeaturedIcon type="mail" />
          <div className="flex w-full flex-col gap-3">
            <h1 className="text-2xl font-semibold leading-8">Check your email</h1>
            <p className="text-base leading-6 text-[#525252]">
              Reset instructions requested for{" "}
              <span className="font-medium">{submittedEmail}</span>
            </p>
          </div>
        </header>

        <a className={primaryButton} href="mailto:">
          Open email app
        </a>

        {error && <p role="alert" className="text-sm text-[#be123c]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[#525252]">{notice}</p>}

        <p className="flex flex-wrap justify-center gap-x-1 text-sm leading-5 text-[#525252]">
          Didn’t receive the email?
          <button
            type="button"
            disabled={pending}
            onClick={() => sendReset(submittedEmail)}
            className="font-semibold text-[#be123c] hover:text-[#9f1239] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
          >
            {pending ? "Sending…" : "Click to resend"}
          </button>
        </p>

        <BackToLogin />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-8 text-center">
      <header className="flex w-full flex-col items-center gap-6">
        <FeaturedIcon type="key" />
        <div className="flex w-full flex-col gap-3">
          <h1 className="text-2xl font-semibold leading-8">Forgot password?</h1>
          <p className="text-base leading-6 text-[#525252]">
            No worries, we’ll send you reset instructions.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} aria-busy={pending} className="flex w-full flex-col gap-6">
        <label className="flex flex-col gap-1.5 text-left text-sm font-medium leading-5 text-[#404040]">
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

        {error && <p role="alert" className="text-sm text-[#be123c]">{error}</p>}
        <button className={primaryButton} type="submit" disabled={pending}>
          {pending ? "Sending…" : "Reset password"}
        </button>
      </form>

      <BackToLogin />
    </div>
  );
}

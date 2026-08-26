import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Log in | LMS",
  description: "Log in to your LMS account",
};

function isMobileRequest(requestHeaders: Headers) {
  const clientHint = requestHeaders.get("sec-ch-ua-mobile");
  const userAgent = requestHeaders.get("user-agent") ?? "";

  return (
    clientHint === "?1" ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    )
  );
}

export default async function LogInPage() {
  const requestHeaders = await headers();
  const isMobile = isMobileRequest(requestHeaders);
  const DesktopReminders = isMobile
    ? null
    : (await import("./desktop-reminders")).default;

  return (
    <main className="flex min-h-screen bg-white text-[#171717]">
      <section className="flex min-h-screen min-w-0 flex-1 flex-col items-center overflow-hidden lg:min-w-[480px]">
        <div className="flex w-full flex-none items-start justify-center px-4 py-12 lg:flex-1 lg:items-center lg:px-8 lg:py-12">
          <div className="flex w-full max-w-[360px] flex-col items-center gap-8">
            <header className="flex w-full flex-col items-center gap-6 text-center">
              <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-xl border-2 border-white/10 bg-[#e11d48] shadow-[0_3px_4px_-1px_rgba(42,42,42,0.14),0_1px_1px_rgba(42,42,42,0.08),inset_0_0_0_1px_rgba(0,0,0,0.2),inset_0_3px_3px_rgba(255,255,255,0.1),inset_0_-3px_3px_rgba(0,0,0,0.1)]">
                <Image
                  src="/log-in/qvds-logomark.svg"
                  alt="QVDS"
                  width={36}
                  height={36}
                  priority
                />
              </div>

              <div className="flex flex-col gap-2 lg:gap-3">
                <h1 className="text-xl font-semibold leading-[30px] lg:text-2xl lg:font-medium lg:leading-8">
                  Welcome back
                </h1>
                <p className="text-base leading-6 text-[#525252]">
                  Welcome back! Please enter your details.
                </p>
              </div>
            </header>

            <form action="/credit-analyst" className="flex w-full flex-col gap-6">
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

                <label className="flex flex-col gap-1.5 text-sm font-medium leading-5 text-[#404040]">
                  Password
                  <input
                    className="h-11 rounded-lg border border-[#d4d4d4] bg-white px-3.5 text-base font-normal leading-6 text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-[#737373] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/15"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    required
                  />
                </label>
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

              <button
                className="flex h-11 w-full items-center justify-center rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-base font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
                type="submit"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>

        <footer className="hidden min-h-24 w-full items-end px-8 py-8 text-sm leading-5 text-[#525252] lg:flex">
          © 2026 QVDS Enterprises. All Rights Reserved
        </footer>
      </section>

      {DesktopReminders ? <DesktopReminders /> : null}
    </main>
  );
}

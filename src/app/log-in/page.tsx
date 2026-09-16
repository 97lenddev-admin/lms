import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./login-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) redirect("/credit-analyst");
  }

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

            <LoginForm />
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

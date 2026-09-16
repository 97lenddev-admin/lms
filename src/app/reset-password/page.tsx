import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password | LMS" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/forgot-password?error=invalid-link");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/forgot-password?error=invalid-link");

  return (
    <main className="flex min-h-screen w-full justify-center bg-white px-4 pb-12 pt-12 text-[#171717] lg:px-8 lg:pt-24">
      <ResetPasswordForm />
    </main>
  );
}

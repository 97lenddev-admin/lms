import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | LMS",
  description: "Request a password reset link",
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen w-full justify-center bg-white px-4 pb-12 pt-12 text-[#171717] lg:px-8 lg:pt-24">
      <ForgotPasswordForm invalidLink={error === "invalid-link"} />
    </main>
  );
}

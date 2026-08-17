import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | LMS",
  description: "Request a password reset link",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen w-full justify-center bg-white px-4 pb-12 pt-12 text-[#171717] lg:px-8 lg:pt-24">
      <ForgotPasswordForm />
    </main>
  );
}

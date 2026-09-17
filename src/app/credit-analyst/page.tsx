import type { Metadata } from "next";
import CreditAnalystApp from "./credit-analyst-app";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Analyst | LMS",
  description: "Create, review, and manage loan applications.",
};

export default async function CreditAnalystPage() {
  await requireUser();
  return <CreditAnalystApp />;
}

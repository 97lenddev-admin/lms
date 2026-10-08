import type { Metadata } from "next";
import CreditInvestigatorApp from "./credit-investigator-app";
import { requireUserRole } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Investigator | LMS",
  description: "Review, claim, and forward loan applications.",
};

export default async function CreditInvestigatorPage() {
  const { profile } = await requireUserRole("Credit Investigator");
  return <CreditInvestigatorApp userProfile={profile} />;
}

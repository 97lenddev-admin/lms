import type { Metadata } from "next";
import CreditAnalystApp from "./credit-analyst-app";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { loanColumns, loanRowToSubmission, type LoanRow } from "./loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Analyst | LMS",
  description: "Create, review, and manage loan applications.",
};

export default async function CreditAnalystPage() {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select(loanColumns)
    .order("created_at", { ascending: false });

  return (
    <CreditAnalystApp
      initialSubmissions={((data ?? []) as LoanRow[]).map(loanRowToSubmission)}
      loadError={error ? "Unable to load loan applications right now." : undefined}
    />
  );
}

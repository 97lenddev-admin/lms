import type { Metadata } from "next";
import CreditAnalystApp from "./credit-analyst-app";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanColumns, loanRowToSubmission, type LoanRow } from "./loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Analyst | LMS",
  description: "Create, review, and manage loan applications.",
};

export default async function CreditAnalystPage() {
  const { profile, supabase } = await requireUserRole("Credit Analyst");
  const [{ data, error }, { data: coMakers }] = await Promise.all([
    supabase
      .from("loans")
      .select(loanColumns)
      .order("created_at", { ascending: false }),
    supabase.from("loan_co_makers").select("loan_id"),
  ]);
  const loansWithCoMakers = new Set(
    (coMakers ?? []).map(coMaker => coMaker.loan_id as string),
  );

  return (
    <CreditAnalystApp
      userProfile={profile}
      initialSubmissions={((data ?? []) as LoanRow[]).map(row =>
        loanRowToSubmission(row, loansWithCoMakers.has(row.id)),
      )}
      loadError={error ? "Unable to load loan applications right now." : undefined}
    />
  );
}

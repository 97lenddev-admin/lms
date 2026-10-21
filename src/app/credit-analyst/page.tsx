import type { Metadata } from "next";
import CreditAnalystApp from "./credit-analyst-app";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanColumns, loanRowToSubmission, type LoanRow } from "./loans";
import {
  coMakerColumns,
  coMakerRowToDetails,
  type LoanCoMakerRow,
} from "./co-makers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Analyst | LMS",
  description: "Create, review, and manage loan applications.",
};

export default async function CreditAnalystPage() {
  const { profile, supabase } = await requireUserRole("Credit Analyst");
  const [{ data, error }, { data: coMakers, error: coMakersError }] = await Promise.all([
    supabase
      .from("loans")
      .select(loanColumns)
      .order("created_at", { ascending: false }),
    supabase.from("loan_co_makers").select(coMakerColumns),
  ]);
  const coMakersByLoanId = new Map(
    ((coMakers ?? []) as LoanCoMakerRow[]).map(coMaker => [
      coMaker.loan_id,
      coMakerRowToDetails(coMaker),
    ]),
  );
  return (
    <CreditAnalystApp
      userProfile={profile}
      initialSubmissions={((data ?? []) as LoanRow[]).map(row =>
        loanRowToSubmission(row, coMakersByLoanId.get(row.id)),
      )}
      loadError={error || coMakersError ? "Unable to load all loan applications or co-maker details right now." : undefined}
    />
  );
}

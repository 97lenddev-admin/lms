import type { Metadata } from "next";
import CreditInvestigatorApp from "./credit-investigator-app";
import { requireUserRole } from "@/lib/supabase/require-user";
import {
  attachInvestigation,
  investigatorLoanColumns,
  loanInvestigationColumns,
  loanRowToInvestigatorLoan,
  type InvestigatorLoanRow,
  type LoanInvestigationRow,
} from "./loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Investigator | LMS",
  description: "Review, claim, and forward loan applications.",
};

export default async function CreditInvestigatorPage() {
  const { user, profile, supabase } = await requireUserRole("Credit Investigator");
  const [loansResult, investigationsResult] = await Promise.all([
    supabase
      .from("loans")
      .select(investigatorLoanColumns)
      .or(
        `claim_status.eq.open,and(claim_status.eq.claimed,claimed_by.eq.${user.id})`,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("loan_credit_investigations")
      .select(loanInvestigationColumns)
      .eq("credit_investigator_id", user.id),
  ]);

  const investigationsByLoanId = new Map(
    ((investigationsResult.data ?? []) as LoanInvestigationRow[]).map(row => [row.loan_id, row]),
  );
  const loans = ((loansResult.data ?? []) as InvestigatorLoanRow[]).map(row =>
    attachInvestigation(
      loanRowToInvestigatorLoan(row),
      investigationsByLoanId.get(row.id),
    ),
  );

  return (
    <CreditInvestigatorApp
      userProfile={profile}
      initialLoans={loans}
      loadError={loansResult.error || investigationsResult.error ? "Unable to load all loan or investigation details right now." : undefined}
    />
  );
}

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
import {
  coMakerColumns,
  coMakerRowToDetails,
  type LoanCoMakerRow,
} from "../credit-analyst/co-makers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credit Investigator | LMS",
  description: "Review, claim, and forward loan applications.",
};

export default async function CreditInvestigatorPage() {
  const { user, profile, supabase } = await requireUserRole("Credit Investigator");
  const [loansResult, investigationsResult, coMakersResult] = await Promise.all([
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
    supabase
      .from("loan_co_makers")
      .select(coMakerColumns),
  ]);

  const investigationsByLoanId = new Map(
    ((investigationsResult.data ?? []) as LoanInvestigationRow[]).map(row => [row.loan_id, row]),
  );
  const coMakersByLoanId = new Map(
    ((coMakersResult.data ?? []) as LoanCoMakerRow[]).map(row => [
      row.loan_id,
      coMakerRowToDetails(row),
    ]),
  );
  const loans = ((loansResult.data ?? []) as InvestigatorLoanRow[]).map(row =>
    attachInvestigation(
      loanRowToInvestigatorLoan(row, coMakersByLoanId.get(row.id)),
      investigationsByLoanId.get(row.id),
    ),
  );

  return (
    <CreditInvestigatorApp
      userProfile={profile}
      initialLoans={loans}
      loadError={loansResult.error || investigationsResult.error || coMakersResult.error ? "Unable to load all loan, co-maker, or investigation details right now." : undefined}
    />
  );
}

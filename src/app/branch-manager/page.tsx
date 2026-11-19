import type { Metadata } from "next";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanRowToSubmission } from "../credit-analyst/loans";
import {
  coMakerColumns,
  coMakerRowToDetails,
  type LoanCoMakerRow,
} from "../credit-analyst/co-makers";
import {
  attachInvestigation,
  investigatorLoanColumns,
  loanInvestigationColumns,
  loanRowToInvestigatorLoan,
  type InvestigatorLoanRow,
  type LoanInvestigationRow,
} from "../credit-investigator/loans";
import BranchManagerApp from "./branch-manager-app";
import type { BranchManagerInvestigation } from "./submission-details";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Branch Manager | LMS", description: "Masterlist of loan submissions." };

export default async function BranchManagerPage() {
  const { profile, supabase } = await requireUserRole("Branch Manager");
  const [loansResult, investigationsResult, coMakersResult] = await Promise.all([
    supabase
      .from("loans")
      .select(investigatorLoanColumns)
      .order("created_at", { ascending: false }),
    supabase
      .from("loan_credit_investigations")
      .select(loanInvestigationColumns),
    supabase
      .from("loan_co_makers")
      .select(coMakerColumns),
  ]);

  if (loansResult.error) console.error("Unable to load Branch Manager loans", loansResult.error);
  if (investigationsResult.error) console.error("Unable to load Branch Manager investigations", investigationsResult.error);
  if (coMakersResult.error) console.error("Unable to load Branch Manager co-makers", coMakersResult.error);

  const loanRows = (loansResult.data ?? []) as InvestigatorLoanRow[];
  const investigationsByLoanId = new Map(
    ((investigationsResult.data ?? []) as LoanInvestigationRow[]).map(row => [row.loan_id, row]),
  );
  const coMakersByLoanId = new Map(
    ((coMakersResult.data ?? []) as LoanCoMakerRow[]).map(row => [
      row.loan_id,
      coMakerRowToDetails(row),
    ]),
  );
  const initialInvestigations = Object.fromEntries(loanRows.flatMap(row => {
    const investigationRow = investigationsByLoanId.get(row.id);
    if (!investigationRow) return [];
    const loan = attachInvestigation(loanRowToInvestigatorLoan(row), investigationRow);
    if (!loan.analysisData || !loan.completedAnalyses) return [];
    const investigation: BranchManagerInvestigation = {
      analysisData: loan.analysisData,
      completedAnalyses: loan.completedAnalyses,
      completedDates: {
        investigation: investigationRow.investigation_report_submited_date ?? undefined,
        cashflow: investigationRow.cashflow_analysis_submitted_date ?? undefined,
        collateral: investigationRow.collateral_analysis_submitted_date ?? undefined,
        disclosure: investigationRow.disclosure_statement_submitted_date ?? undefined,
      },
    };
    return [[row.id, investigation] as const];
  }));

  return (
    <BranchManagerApp
      userProfile={profile}
      initialSubmissions={loanRows.map(row => loanRowToSubmission(row, coMakersByLoanId.get(row.id)))}
      initialInvestigations={initialInvestigations}
      loadError={loansResult.error || coMakersResult.error ? "Unable to load loan submissions or co-maker details right now. Please try again later." : undefined}
    />
  );
}

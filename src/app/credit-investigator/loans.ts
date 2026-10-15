import type { Submission } from "../credit-analyst/data";
import type { AnalysisData, AnalysisPage } from "./analysis-pages";
import {
  loanColumns,
  loanRowToSubmission,
  type LoanRow,
} from "../credit-analyst/loans";

export type InvestigatorStatus =
  | "Open"
  | "Claimed"
  | "Yours"
  | "Active"
  | "Approved"
  | "Pending"
  | "Rejected"
  | "Inactive";

export type InvestigatorClaimStatus = "open" | "claimed";

export type SurrenderedItem = {
  description: string;
  model: string;
  serial: string;
  rate: string;
};

export type InvestigatorLoan = {
  databaseId: string;
  id: string;
  name: string;
  amount: string;
  submittedBy: string;
  submitted: string;
  status: InvestigatorStatus;
  claimStatus: InvestigatorClaimStatus;
  decisionStatus: InvestigatorStatus;
  product?: string;
  term: string;
  details?: Submission["details"];
  recommendedAmount?: string;
  investigationId?: string;
  analysisData?: AnalysisData;
  completedAnalyses?: AnalysisPage[];
  surrenderedItems?: SurrenderedItem[];
};

export type InvestigatorLoanRow = LoanRow & {
  claim_status: string | null;
  recommended_amount: number | string | null;
};

export type LoanInvestigationRow = {
  id: string;
  loan_id: string;
  business: unknown;
  other_lending: unknown;
  computations_comments_observations: string | null;
  other_pending_requirements: string | null;
  insurance_and_deposit_disclosure: unknown;
  plate_no: string | null;
  collateral_items: unknown;
  surrendered_items: unknown;
  investigation_report_submited_date: string | null;
  cashflow_analysis_submitted_date: string | null;
  collateral_analysis_submitted_date: string | null;
  disclosure_statement_submitted_date: string | null;
  investigation_report_status: string | null;
  cashflow_analysis_status: string | null;
  collateral_analysis_status: string | null;
  disclosure_statement_status: string | null;
};

export const investigatorLoanColumns = `${loanColumns}, claim_status, recommended_amount`;
export const loanInvestigationColumns = "id, loan_id, business, other_lending, computations_comments_observations, other_pending_requirements, insurance_and_deposit_disclosure, plate_no, collateral_items, surrendered_items, investigation_report_submited_date, cashflow_analysis_submitted_date, collateral_analysis_submitted_date, disclosure_statement_submitted_date, investigation_report_status, cashflow_analysis_status, collateral_analysis_status, disclosure_statement_status";

function normalizeClaimStatus(value: string | null): InvestigatorClaimStatus {
  return value?.trim().toLowerCase() === "claimed" ? "claimed" : "open";
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

const collateralAges: Record<string, string> = {
  "1_to_6_months": "1–6 months",
  "7_months_to_2_years": "7 months–2 years",
  "3_to_5_years": "3–5 years",
  "6_plus_years": "6+ years",
};

export function loanRowToInvestigatorLoan(
  row: InvestigatorLoanRow,
): InvestigatorLoan {
  const submission = loanRowToSubmission(row);
  const claimStatus = normalizeClaimStatus(row.claim_status);

  return {
    databaseId: row.id,
    id: submission.id,
    name: submission.name,
    amount: submission.amount,
    submittedBy: "Credit Analyst",
    submitted: submission.submitted,
    status: claimStatus === "claimed" ? submission.status : "Open",
    claimStatus,
    decisionStatus: submission.status,
    product: submission.product,
    term: submission.term,
    details: submission.details,
    recommendedAmount: text(row.recommended_amount),
  };
}

export function attachInvestigation(
  loan: InvestigatorLoan,
  investigation?: LoanInvestigationRow,
): InvestigatorLoan {
  if (!investigation) return loan;

  const business = records(investigation.business)[0] ?? {};
  const insurance = objectValue(investigation.insurance_and_deposit_disclosure);
  const completedAnalyses: AnalysisPage[] = [];
  if (investigation.investigation_report_submited_date || investigation.investigation_report_status) completedAnalyses.push("investigation");
  if (investigation.cashflow_analysis_submitted_date || investigation.cashflow_analysis_status) completedAnalyses.push("cashflow");
  if (investigation.collateral_analysis_submitted_date || investigation.collateral_analysis_status) completedAnalyses.push("collateral");
  if (investigation.disclosure_statement_submitted_date || investigation.disclosure_statement_status) completedAnalyses.push("disclosure");

  return {
    ...loan,
    investigationId: investigation.id,
    completedAnalyses,
    surrenderedItems: records(investigation.surrendered_items).map(item => ({
      description: text(item.item_description ?? item.description),
      model: text(item.model_brand ?? item.model),
      serial: text(item.engine_serial_no ?? item.serial),
      rate: text(item.rate),
    })),
    analysisData: {
      recommendedAmount: loan.recommendedAmount ?? "",
      businessStatus: text(business.status),
      observations: text(investigation.computations_comments_observations),
      pendingRequirements: text(investigation.other_pending_requirements),
      lendingRecords: records(investigation.other_lending).map(record => ({
        company: text(record.company),
        amount: text(record.loan_amount ?? record.amount),
        installment: text(record.installment),
        remarks: text(record.remarks),
        undisclosed: Boolean(record.undisclosed),
      })),
      plateNumber: text(investigation.plate_no),
      insurance: text(insurance.selected_option),
      incomes: { sales1: "45000", sales2: "0", sales3: "0", salaries: "22000", pensions: "0", remittance: "0" },
      expenses: { materials: "12000", businessUtilities: "3500", businessRent: "5000", personnel: "4000", taxes: "1200", loans: "2000", food: "8000", householdRent: "0", school: "2500", householdUtilities: "1800", medical: "1000" },
      collateral: records(investigation.collateral_items).map(item => ({
        description: text(item.item_description ?? item.description),
        age: collateralAges[text(item.age_range ?? item.age)] ?? text(item.age_range ?? item.age),
        value: text(item.fair_market_value ?? item.value),
      })),
    },
  };
}

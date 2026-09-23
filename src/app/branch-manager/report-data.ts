import type { Submission } from "../credit-analyst/data";

export type ReportLoan = Submission & { disbursedAmount?: number; isRestructured?: boolean };
export type ReportFilters = { status: string; product: string; from: string; to: string; sort: "newest" | "oldest" };
export const defaultReportFilters: ReportFilters = { status: "", product: "", from: "2025-06-01", to: "2026-04-30", sort: "newest" };
export const reportProduct = (loan: Submission) => `${loan.amount.replace(/\.00$/, "")} / ${loan.term}`;

export function filterReport(rows: ReportLoan[], filters: ReportFilters) {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return rows.filter(loan => {
    const date = Date.parse(`${loan.submitted} UTC`);
    return (!filters.status || loan.status === filters.status)
      && (!filters.product || reportProduct(loan) === filters.product)
      && (!filters.from || date >= Date.parse(`${filters.from}T00:00:00Z`))
      && (!filters.to || date <= Date.parse(`${filters.to}T23:59:59.999Z`));
  }).sort((a, b) => (Date.parse(a.submitted) - Date.parse(b.submitted)) * (filters.sort === "oldest" ? 1 : -1));
}

export function reportSummary(rows: ReportLoan[]) {
  // Active and inactive loans have already passed approval; pending loans are undecided.
  const approved = rows.filter(row => ["Approved", "Active", "Inactive"].includes(row.status)).length;
  const decided = approved + rows.filter(row => row.status === "Rejected").length;
  return {
    submissions: rows.length,
    approvalRate: decided ? Math.round(approved / decided * 100) : null,
    // Loan principal alone is not evidence that funds were disbursed or a loan restructured.
    disbursed: rows.every(row => row.disbursedAmount !== undefined) ? rows.reduce((sum, row) => sum + row.disbursedAmount!, 0) : null,
    restructured: rows.every(row => row.isRestructured !== undefined) ? rows.filter(row => row.isRestructured).length : null,
  };
}

export function reportCsv(rows: ReportLoan[]) {
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return "\uFEFF" + [["Loan ID", "Client", "Loan amount (PHP)", "Date submitted", "Status"], ...rows.map(row => [row.id, row.name, row.amount.replace(/[^\d.]/g, ""), row.submitted, row.status])].map(row => row.map(cell).join(",")).join("\r\n");
}

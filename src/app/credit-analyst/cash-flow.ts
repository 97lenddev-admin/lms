export type CashFlowField = {
  key: string;
  label: string;
  applicationKey?: string;
  databaseColumn?: string;
  group: "incomes" | "expenses";
};

export const cashFlowGroups: { title: string; fields: CashFlowField[] }[] = [
  {
    title: "Business income",
    fields: [
      { key: "sales1", label: "Gross business sales 1", databaseColumn: "gross_business_sales_1", group: "incomes" },
      { key: "sales2", label: "Gross business sales 2", databaseColumn: "gross_business_sales_2", group: "incomes" },
      { key: "sales3", label: "Gross business sales 3", databaseColumn: "gross_business_sales_3", group: "incomes" },
    ],
  },
  {
    title: "Business expenses",
    fields: [
      { key: "materials", label: "Raw materials", databaseColumn: "raw_materials", group: "expenses" },
      { key: "businessUtilities", label: "Utilities", applicationKey: "Business utilities", databaseColumn: "utilities", group: "expenses" },
      { key: "businessRent", label: "Rent", applicationKey: "Business rent", databaseColumn: "business_rent", group: "expenses" },
      { key: "personnel", label: "Personnel", databaseColumn: "personnel", group: "expenses" },
      { key: "taxes", label: "Taxes", databaseColumn: "taxes", group: "expenses" },
      { key: "loans", label: "Loan payments", databaseColumn: "loan_payments", group: "expenses" },
    ],
  },
  {
    title: "Household income",
    fields: [
      { key: "salaries", label: "Salaries", databaseColumn: "salaries", group: "incomes" },
      { key: "pensions", label: "Pensions", databaseColumn: "pensions", group: "incomes" },
      { key: "remittance", label: "Remittance", databaseColumn: "remittance", group: "incomes" },
    ],
  },
  {
    title: "Household expenses",
    fields: [
      { key: "food", label: "Food", databaseColumn: "food", group: "expenses" },
      { key: "householdRent", label: "Rent", applicationKey: "Household rent", databaseColumn: "household_rent", group: "expenses" },
      { key: "school", label: "School", databaseColumn: "school", group: "expenses" },
      { key: "householdUtilities", label: "Utilities", applicationKey: "Household utilities", databaseColumn: "income_utilities", group: "expenses" },
      { key: "medical", label: "Medical", databaseColumn: "medical", group: "expenses" },
    ],
  },
];

export const cashFlowFields = cashFlowGroups.flatMap(({ fields }) => fields);
export const cashFlowFieldLabels = cashFlowFields.map(({ label, applicationKey }) => applicationKey ?? label);
export const cashFlowDisplayLabels = cashFlowFields.map(({ label }) => label);

export function applicationCashFlowToAnalysis(values?: Record<string, string>) {
  const incomes: Record<string, string> = {};
  const expenses: Record<string, string> = {};

  cashFlowFields.forEach(({ key, label, applicationKey, group }) => {
    (group === "incomes" ? incomes : expenses)[key] = values?.[applicationKey ?? label] ?? "";
  });

  return { incomes, expenses };
}

export function databaseCashFlowToAnalysis(
  row: object,
  fallback?: Record<string, string>,
) {
  const databaseValues = row as Record<string, unknown>;
  const incomes: Record<string, string> = {};
  const expenses: Record<string, string> = {};

  cashFlowFields.forEach(({ key, label, applicationKey, databaseColumn, group }) => {
    const databaseValue = databaseColumn ? databaseValues[databaseColumn] : null;
    const value = databaseValue == null
      ? fallback?.[applicationKey ?? label] ?? ""
      : String(databaseValue);
    (group === "incomes" ? incomes : expenses)[key] = value;
  });

  return { incomes, expenses };
}

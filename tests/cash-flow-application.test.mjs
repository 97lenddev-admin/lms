import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applicationCashFlowToAnalysis,
  cashFlowFields,
  databaseCashFlowToAnalysis,
} from "../src/app/credit-analyst/cash-flow.ts";

test("cash flow is the ninth mobile application section", () => {
  const source = readFileSync(new URL("../src/app/credit-analyst/data.ts", import.meta.url), "utf8");
  const sectionIds = [...source.matchAll(/\{ id: "([^"]+)", title:/g)].map(([, id]) => id);
  assert.deepEqual(sectionIds.slice(0, 9), ["personal", "business", "household", "other", "relative", "loan", "documents", "schedule", "cashflow"]);
});

test("submitted cash flow values map to the investigator analysis fields", () => {
  const values = {
    "Gross business sales 1": "45000",
    "Business rent": "5000",
    "Salaries": "22000",
    "Household rent": "8000",
  };
  const analysis = applicationCashFlowToAnalysis(values);

  assert.equal(analysis.incomes.sales1, "45000");
  assert.equal(analysis.expenses.businessRent, "5000");
  assert.equal(analysis.incomes.salaries, "22000");
  assert.equal(analysis.expenses.householdRent, "8000");
});

test("submitted cash flow columns are passed to investigator analysis", () => {
  const actionSource = readFileSync(new URL("../src/app/credit-analyst/actions.ts", import.meta.url), "utf8");
  const loanSource = readFileSync(new URL("../src/app/credit-investigator/loans.ts", import.meta.url), "utf8");

  assert.match(actionSource, /cashFlow,\s*\n\s*additionalFields:/);
  assert.match(loanSource, /databaseCashFlowToAnalysis\(row, submission\.details\?\.cashFlow\)/);
  assert.match(loanSource, /incomes: loan\.analysisData\?\.incomes/);
  assert.match(loanSource, /expenses: loan\.analysisData\?\.expenses/);
});

test("Supabase loan columns populate every cash flow analysis section", () => {
  const analysis = databaseCashFlowToAnalysis({
    gross_business_sales_1: 45000,
    gross_business_sales_2: 5000,
    gross_business_sales_3: 2500,
    raw_materials: 12000,
    utilities: 3500,
    business_rent: 5000,
    personnel: 4000,
    taxes: 1200,
    loan_payments: 2000,
    salaries: 22000,
    pensions: 1000,
    remittance: 3000,
    food: 8000,
    household_rent: 6000,
    school: 2500,
    income_utilities: 1800,
    medical: 1000,
  });

  assert.deepEqual(analysis.incomes, {
    sales1: "45000", sales2: "5000", sales3: "2500",
    salaries: "22000", pensions: "1000", remittance: "3000",
  });
  assert.deepEqual(analysis.expenses, {
    materials: "12000", businessUtilities: "3500", businessRent: "5000",
    personnel: "4000", taxes: "1200", loans: "2000", food: "8000",
    householdRent: "6000", school: "2500", householdUtilities: "1800",
    medical: "1000",
  });
});

test("cash flow fields map to the verified loans table columns", () => {
  assert.deepEqual(
    cashFlowFields.flatMap(field => field.databaseColumn ?? []),
    [
      "gross_business_sales_1", "gross_business_sales_2", "gross_business_sales_3",
      "raw_materials", "utilities", "business_rent", "personnel", "taxes",
      "loan_payments", "salaries", "pensions", "remittance", "food",
      "household_rent", "school", "income_utilities", "medical",
    ],
  );
});

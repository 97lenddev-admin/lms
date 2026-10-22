import assert from "node:assert/strict";
import test from "node:test";
import { loanRowToSubmission } from "../src/app/credit-analyst/loans.ts";

const baseLoan = {
  id: "database-id",
  loan_id: "loan-id",
  first_name: "Maria",
  middle_name: null,
  last_name: "Santos",
  loan_amount: 1000,
  term: 10,
  status: "pending",
  created_at: "2026-10-21T00:00:00.000Z",
};

test("loan mapping tolerates a missing loan product", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: null,
  });

  assert.equal(submission.product, undefined);
});

test("loan mapping still formats a provided loan product", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "semi-monthly",
  });

  assert.equal(submission.product, "Semi-Monthly");
});

test("loan mapping reads submitted cash flow metadata", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "daily",
    supporting_documents: [{
      kind: "application_metadata",
      cashFlow: { "Gross business sales 1": "45000" },
    }],
  });

  assert.equal(submission.details.cashFlow["Gross business sales 1"], "45000");
});

test("loan mapping prefers direct cash flow columns for both utilities fields", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "daily",
    gross_business_sales_1: 50000,
    utilities: 3500,
    household_rent: 8000,
    income_utilities: 2100,
    supporting_documents: [{
      kind: "application_metadata",
      cashFlow: {
        "Gross business sales 1": "45000",
        "Household utilities": "1800",
      },
    }],
  });

  assert.equal(submission.details.cashFlow["Gross business sales 1"], "50000");
  assert.equal(submission.details.cashFlow["Business utilities"], "3500");
  assert.equal(submission.details.cashFlow["Household rent"], "8000");
  assert.equal(submission.details.cashFlow["Household utilities"], "2100");
});

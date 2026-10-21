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

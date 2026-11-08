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

test("loan mapping preserves private storage paths for supporting documents", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "daily",
    supporting_documents: [{
      kind: "file",
      name: "permit.pdf",
      size: "200 KB",
      path: "user-id/document-id-permit.pdf",
    }],
  });

  assert.deepEqual(submission.details.supportingDocuments, [{
    name: "permit.pdf",
    size: "200 KB",
    path: "user-id/document-id-permit.pdf",
  }]);
});

test("loan mapping parses applicant and co-maker 2x2 picture metadata", () => {
  const pictures = [
    { kind: "applicant_2x2", name: "applicant.jpg", size: "120 KB", path: "user/id-pictures/applicant.jpg" },
    { kind: "co_maker_2x2", name: "co-maker.png", size: "95 KB", path: "user/id-pictures/co-maker.png" },
  ];
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "daily",
    id_pictures: JSON.stringify(pictures),
  });

  assert.deepEqual(submission.details.idPictures, pictures);
});

test("loan mapping includes rejection notes for the submitted view", () => {
  const submission = loanRowToSubmission({
    ...baseLoan,
    loan_product: "daily",
    status: "rejected",
    reason_for_rejection: " Insufficient debt capacity ",
    rejection_additional_details: " Monthly obligations exceed the allowed ratio. ",
  });

  assert.equal(submission.status, "Rejected");
  assert.equal(submission.rejectionReason, "Insufficient debt capacity");
  assert.equal(submission.rejectionAdditionalDetails, "Monthly obligations exceed the allowed ratio.");
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

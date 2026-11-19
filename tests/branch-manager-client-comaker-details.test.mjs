import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Branch Manager loads and displays dynamic client and co-maker details", () => {
  const page = readFileSync(
    new URL("../src/app/branch-manager/page.tsx", import.meta.url),
    "utf8",
  );
  const details = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL("../supabase/migrations/20261116104011_allow_branch_managers_read_loan_co_makers.sql", import.meta.url),
    "utf8",
  );

  assert.match(page, /\.from\("loan_co_makers"\)\s*\.select\(coMakerColumns\)/);
  assert.match(page, /loanRowToSubmission\(row, coMakersByLoanId\.get\(row\.id\)\)/);
  assert.match(details, /value=\{loan\.details\?\.dateOfBirth\}/);
  assert.match(details, /value=\{loan\.details\?\.contactNumber\}/);
  assert.match(details, /value=\{loan\.details\?\.civilStatus\}/);
  assert.match(details, /value=\{loan\.details\?\.citizenship\}/);
  assert.match(details, /value=\{loan\.details\?\.emailFacebookAddress\}/);
  assert.match(details, /value=\{coMaker\.relationshipToBorrower\}/);
  assert.match(details, /value=\{coMaker\.contactNumber\}/);
  assert.match(details, /value=\{coMaker\.dateOfBirth\}/);
  assert.match(details, /value=\{coMaker\.grossMonthlyIncome\}/);
  assert.match(details, /coMaker\.children\.map/);
  assert.match(details, /coMaker\.businesses\.map/);
  assert.match(details, /value=\{loan\.details\?\.purposeOfLoan\}/);
  assert.match(details, /businesses\.map\(\(business, index\)/);
  assert.match(details, /value=\{loan\.details\?\.grossMonthlyIncome\}/);
  assert.doesNotMatch(details, /loan\.details\?\.dateOfBirth \?\? sample\?\.birth/);
  assert.doesNotMatch(details, /coMaker\?\.relationshipToBorrower \?\?/);
  assert.doesNotMatch(details, /value=\{sample\?\.purpose\}/);
  assert.doesNotMatch(details, /value=\{sample\?\.business\}/);
  assert.match(migration, /create policy "Branch managers read loan co-makers"/);
});

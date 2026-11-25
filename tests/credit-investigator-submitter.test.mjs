import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const loans = readFileSync(
  new URL("../src/app/credit-investigator/loans.ts", import.meta.url),
  "utf8",
);
const app = readFileSync(
  new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../src/app/credit-investigator/page.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261125002000_store_loan_submitter_account_name.sql",
    import.meta.url,
  ),
  "utf8",
);

test("Credit Investigator tables use the submitting account name", () => {
  assert.match(actions, /submitted_by_name: profile\.fullName/);
  assert.match(loans, /submittedBy: row\.submitted_by_name\?\.trim\(\) \|\| "Credit Analyst"/);
  assert.match(migration, /add column if not exists submitted_by_name text/i);
});

test("loan lists and submissions remain available before the migration", () => {
  assert.match(actions, /submitterColumnUnavailable/);
  assert.match(actions, /insertLoan\(legacyPayload\)/);
  assert.match(page, /submitterColumnUnavailable/);
  assert.match(page, /loadLoans\(legacyInvestigatorLoanColumns\)/);
});

test("long applicant names truncate instead of wrapping in investigator lists", () => {
  assert.match(app, /className="block truncate" title=\{loan\.name\}/);
  assert.match(app, /className="block truncate" title=\{loan\.submittedBy\}/);
  assert.match(app, /className="truncate font-semibold text-\[#262626\]" title=\{loan\.name\}/);
});

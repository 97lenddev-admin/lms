import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Branch Manager edit saves the selected amount, term, and editing reason", () => {
  const actions = readFileSync(
    new URL("../src/app/branch-manager/actions.ts", import.meta.url),
    "utf8",
  );
  const details = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20261118070531_allow_branch_managers_edit_loan_terms.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(actions, /export async function updateLoanTerms/);
  assert.match(actions, /loan_amount: normalizedAmount/);
  assert.match(actions, /term: normalizedTerm/);
  assert.match(actions, /reason_for_editing: normalizedReason \|\| null/);
  assert.match(actions, /requireUserRole\("Branch Manager"\)/);
  assert.match(details, /updateLoanTerms\(loan\.databaseId, displayLoan\.amount, displayLoan\.term, note\)/);
  assert.match(details, /onSave\?\.\(displayLoan\)/);
  assert.match(details, /action === "save" \? "Saving…"/);
  assert.match(migration, /grant update \(loan_amount, term, reason_for_editing\)/i);
  assert.match(migration, /for update\s+to authenticated/i);
  assert.match(migration, /loan_amount > 0/);
  assert.match(migration, /term > 0/);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Branch Manager approval stores the note and marks the loan Approved", () => {
  const action = readFileSync(
    new URL("../src/app/branch-manager/actions.ts", import.meta.url),
    "utf8",
  );
  const details = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20261118063834_allow_branch_managers_approve_loans.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(action, /requireUserRole\("Branch Manager"\)/);
  assert.match(action, /reason_for_approving: normalizedReason/);
  assert.match(action, /status: "approved"/);
  assert.match(action, /\.eq\("id", normalizedLoanId\)/);
  assert.match(action, /\.ilike\("status", "active"\)/);
  assert.match(details, /approveLoan\(loan\.databaseId, note\)/);
  assert.match(details, /status: "Approved" as const/);
  assert.match(migration, /grant update \(status, reason_for_approving\)/i);
  assert.match(migration, /for update\s+to authenticated/i);
  assert.match(migration, /lower\(status\) = 'active'/i);
  assert.match(migration, /lower\(status\) = 'approved'/i);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
});

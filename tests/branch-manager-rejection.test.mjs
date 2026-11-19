import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Branch Manager rejection records its reason and marks the loan rejected", () => {
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
      "../supabase/migrations/20261118065123_allow_branch_managers_reject_loans.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(actions, /export async function rejectLoan/);
  assert.match(actions, /requireUserRole\("Branch Manager"\)/);
  assert.match(actions, /reason_for_rejection: normalizedReason/);
  assert.match(actions, /rejection_additional_details: normalizedDetails \|\| null/);
  assert.match(actions, /status: "rejected"/);
  assert.match(actions, /\.ilike\("status", "active"\)/);
  assert.match(details, /rejectLoan\(loan\.databaseId, choice, note\)/);
  assert.match(details, /status: "Rejected" as const/);
  assert.match(details, /rejectionReason: choice/);
  assert.match(details, /rejectionAdditionalDetails: note \|\| undefined/);
  assert.match(migration, /grant update \(status, reason_for_rejection, rejection_additional_details\)/i);
  assert.match(migration, /for update\s+to authenticated/i);
  assert.match(migration, /lower\(status\) = 'active'/i);
  assert.match(migration, /lower\(status\) = 'rejected'/i);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
});

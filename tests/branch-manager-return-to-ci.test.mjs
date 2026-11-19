import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Branch Manager return-to-CI saves revision details and marks the loan pending", () => {
  const actions = readFileSync(
    new URL("../src/app/branch-manager/actions.ts", import.meta.url),
    "utf8",
  );
  const details = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );
  const loans = readFileSync(
    new URL("../src/app/credit-analyst/loans.ts", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20261118065900_allow_branch_managers_return_loans_to_ci.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(actions, /export async function returnLoanToCi/);
  assert.match(actions, /revision_details: normalizedDetails/);
  assert.match(actions, /status: "pending"/);
  assert.match(actions, /\.ilike\("status", "active"\)/);
  assert.match(details, /returnLoanToCi\(loan\.databaseId, note\)/);
  assert.match(details, /status: "Pending" as const/);
  assert.match(details, /revisionDetails: note/);
  assert.match(loans, /revision_details: string \| null/);
  assert.match(loans, /revisionDetails: row\.revision_details\?\.trim\(\) \|\| undefined/);
  assert.match(migration, /grant update \(status, revision_details\)/i);
  assert.match(migration, /for update\s+to authenticated/i);
  assert.match(migration, /lower\(status\) = 'active'/i);
  assert.match(migration, /lower\(status\) = 'pending'/i);
  assert.match(migration, /nullif\(btrim\(revision_details\), ''\) is not null/i);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
});

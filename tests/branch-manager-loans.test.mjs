import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("branch manager master list loads loans from Supabase", () => {
  const page = readFileSync(
    new URL("../src/app/branch-manager/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /requireUserRole\("Branch Manager"\)/);
  assert.match(page, /\.from\("loans"\)/);
  assert.match(page, /\.select\(loanColumns\)/);
  assert.match(page, /\.map\(row => loanRowToSubmission\(row\)\)/);
  assert.match(page, /initialSubmissions=/);
});

test("branch managers receive read-only loan access through RLS", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20261103000000_allow_branch_managers_read_loans.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /grant select on table public\.loans to authenticated/i);
  assert.match(migration, /for select\s+to authenticated/i);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)/i);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const actions = readFileSync(
  new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261125000000_use_sequential_loan_ids.sql",
    import.meta.url,
  ),
  "utf8",
);

test("loan creation lets PostgreSQL assign the loan reference", () => {
  const createLoanAction = actions.slice(
    actions.indexOf("export async function createLoanApplication"),
    actions.indexOf("export async function createLoanCoMaker"),
  );

  assert.doesNotMatch(createLoanAction, /Date\.now\(\)/);
  assert.doesNotMatch(createLoanAction, /loan_id\s*:/);
  assert.match(createLoanAction, /\.from\("loans"\)\s*\.insert\(insertPayload\)/);
  assert.match(createLoanAction, /await insertLoan\(payload\)/);
});

test("loan references use an atomic, incrementing database sequence", () => {
  assert.match(migration, /create sequence if not exists public\.loan_id_seq/i);
  assert.match(migration, /setval\('public\.loan_id_seq', next_loan_number, false\)/i);
  assert.match(migration, /'LN-' \|\| lpad\(nextval\('public\.loan_id_seq'\)::text, 8, '0'\)/i);
  assert.match(migration, /create unique index if not exists loans_loan_id_key/i);
});

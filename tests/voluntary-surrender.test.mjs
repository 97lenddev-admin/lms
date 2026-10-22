import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/app/credit-investigator/actions.ts", import.meta.url),
  "utf8",
);

test("voluntary surrender saves to the owned investigation without a missing RPC", () => {
  const start = source.indexOf("export async function saveVoluntarySurrender");
  const end = source.indexOf("export async function saveInvestigationReport", start);
  const action = source.slice(start, end);

  assert.doesNotMatch(action, /rpc\("voluntary_surrender"/);
  assert.match(action, /\.from\("loan_credit_investigations"\)\s*\.update\(\{/);
  assert.match(action, /surrendered_items: surrenderedItems/);
  assert.match(action, /signed_attestation_image:/);
  assert.match(action, /\.eq\("id", investigationId\)/);
  assert.match(action, /\.eq\("credit_investigator_id", user\.id\)/);
  assert.match(action, /\.select\("id"\)\s*\.maybeSingle\(\)/);
});

test("failed voluntary surrender writes remove the uploaded attestation", () => {
  const start = source.indexOf("export async function saveVoluntarySurrender");
  const end = source.indexOf("export async function saveInvestigationReport", start);
  const action = source.slice(start, end);

  assert.match(action, /if \(surrenderError \|\| !savedInvestigation\)/);
  assert.match(action, /\.from\("loan-attestations"\)\s*\.remove\(\[objectPath\]\)/);
});

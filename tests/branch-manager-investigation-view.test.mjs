import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("active Branch Manager loans open Credit Investigator reports read-only", () => {
  const source = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ AnalysisWorkspace, defaultAnalysisData, type AnalysisData, type AnalysisPage \}/);
  assert.match(source, /loan\.status === "Active" \? setAnalysisPage\(artifact\.page\)/);
  assert.match(source, /completed=\{investigation\?\.completedAnalyses \?\? completedAnalysisPages\}/);
  assert.match(source, /cashFlowReadOnly/);
  assert.match(source, /readOnlyMode/);
  assert.match(source, /\[&_footer\]:hidden/);
  assert.match(source, /investigation\?\.analysisData/);
  assert.match(source, /investigation\?\.completedDates\[analysisPage\]/);
});

test("Branch Manager loads saved Credit Investigator analysis data", () => {
  const page = readFileSync(
    new URL("../src/app/branch-manager/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /\.from\("loan_credit_investigations"\)/);
  assert.match(page, /\.select\(loanInvestigationColumns\)/);
  assert.match(page, /attachInvestigation\(loanRowToInvestigatorLoan\(row\), investigationRow\)/);
  assert.match(page, /initialInvestigations=\{initialInvestigations\}/);
});

test("Branch Managers receive read-only RLS access to active investigations", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261116095156_allow_branch_managers_read_investigations.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /grant select on table public\.loan_credit_investigations to authenticated/i);
  assert.match(migration, /for select\s+to authenticated/i);
  assert.match(migration, /profile\.roles = 'Branch Manager'/);
  assert.match(migration, /lower\(loan\.status\) = 'active'/);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)/i);
});

test("only Active Branch Manager submissions show approval actions", () => {
  const source = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const active = loan\.status === "Active"/);
  assert.match(source, /!editing && active && <footer className=\{styles\.decisionActions\}>/);
  assert.doesNotMatch(source, /const pending = loan\.status === "Pending"/);
});

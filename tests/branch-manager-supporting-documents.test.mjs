import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Branch Manager details render supporting documents from the selected loan", () => {
  const source = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const supportingDocuments = loan\.details\?\.supportingDocuments \?\? \[\]/);
  assert.match(source, /supportingDocuments\.length \? <>\{supportingDocuments\.map/);
  assert.match(source, /<strong>\{file\.name\}<\/strong>/);
  assert.match(source, /\{file\.size\} · Uploaded \{submitted\}/);
});

test("Branch Manager can open stored supporting documents through an authorized signed URL", () => {
  const details = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );
  const actions = readFileSync(
    new URL("../src/app/branch-manager/actions.ts", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL("../supabase/migrations/20261116102956_allow_branch_managers_read_application_documents.sql", import.meta.url),
    "utf8",
  );

  assert.match(details, /createLoanDocumentViewUrl\(file\.path\)/);
  assert.match(details, /aria-label={`View \$\{file\.name\}`}/);
  assert.match(actions, /requireUserRole\("Branch Manager"\)/);
  assert.match(actions, /\.createSignedUrl\(path, 60\)/);
  assert.match(migration, /create policy "Branch managers read application documents"/);
  assert.match(migration, /document ->> 'path' = storage\.objects\.name/);
  assert.match(migration, /coalesce\(document ->> 'kind', 'file'\) = 'file'/);
  assert.match(migration, /loan\.supporting_documents -> 'files'/);
  assert.match(actions, /error\?\.message === "Object not found"/);
});

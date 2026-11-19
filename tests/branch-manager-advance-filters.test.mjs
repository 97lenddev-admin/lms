import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Branch Manager more filters includes client name and loan ID", () => {
  const source = readFileSync(
    new URL("../src/app/branch-manager/advance-filters.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /clientName: string; loanId: string/);
  assert.match(source, /Client name<input type="search"/);
  assert.match(source, /Loan ID<input type="search"/);
  assert.match(source, /loan\.name\.toLowerCase\(\)\.includes\(filters\.clientName\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(source, /loan\.id\.toLowerCase\(\)\.includes\(filters\.loanId\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(source, /filterSearchField/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../src/app/credit-investigator/page.tsx", import.meta.url),
  "utf8",
);

test("Credit Investigator receives only loans with a saved co-maker", () => {
  assert.match(page, /\.filter\(row => coMakersByLoanId\.has\(row\.id\)\)/);
  assert.match(
    page,
    /loanRowToInvestigatorLoan\(row, coMakersByLoanId\.get\(row\.id\)\)/,
  );
});

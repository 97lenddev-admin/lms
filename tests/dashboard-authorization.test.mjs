import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const dashboards = [
  ["credit-analyst", "Credit Analyst"],
  ["credit-investigator", "Credit Investigator"],
  ["branch-manager", "Branch Manager"],
  ["cashier", "Cashier"],
];

for (const [route, role] of dashboards) {
  test(`/${route} requires the ${role} role`, () => {
    const source = readFileSync(
      new URL(`../src/app/${route}/page.tsx`, import.meta.url),
      "utf8",
    );

    assert.match(source, /import \{ requireUserRole \}/);
    assert.match(source, new RegExp(`requireUserRole\\("${role}"\\)`));
    assert.doesNotMatch(source, /requireUser\(\)/);
  });
}

test("loan creation independently requires the Credit Analyst role", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ requireUserRole \}/);
  assert.match(source, /requireUserRole\("Credit Analyst"\)/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const pages = [
  "credit-analyst",
  "credit-investigator",
  "branch-manager",
  "cashier",
];

for (const route of pages) {
  test(`/${route} passes the authorized profile to its dashboard`, () => {
    const source = readFileSync(
      new URL(`../src/app/${route}/page.tsx`, import.meta.url),
      "utf8",
    );

    assert.match(source, /\{ profile(?:, supabase)? \} = await requireUserRole/);
    assert.match(source, /userProfile=\{profile\}/);
  });
}

test("all dashboard navigation variants render the profile name and role", () => {
  const files = [
    "../src/app/credit-analyst/navigation.tsx",
    "../src/app/branch-manager/branch-manager-app.tsx",
    "../src/app/cashier/cashier-app.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /userProfile\.fullName/);
    assert.match(source, /userProfile\.role/);
  }
});

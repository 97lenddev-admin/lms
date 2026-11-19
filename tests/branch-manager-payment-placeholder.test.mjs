import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("branch manager loan view falls back to a static payment schedule", () => {
  const source = readFileSync(
    new URL("../src/app/branch-manager/submission-details.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const paymentPlaceholder = \{ firstDue: "2026-06-24", count: 60, amount: 1108 \}/);
  assert.match(source, /firstDue=\{scheduleAvailable \? sample\?\.firstDue : paymentPlaceholder\.firstDue\}/);
});

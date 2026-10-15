import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("credit investigator rejection records the reason and marks the loan rejected", () => {
  const actions = readFileSync(
    new URL("../src/app/credit-investigator/actions.ts", import.meta.url),
    "utf8",
  );
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(actions, /rpc\("credit_investigation_rejected"/);
  assert.match(actions, /p_stage: "investigation report"/);
  assert.match(actions, /p_reason_for_rejection: normalizedReason/);
  assert.match(actions, /p_rejection_additional_details: normalizedDetails/);
  assert.match(app, /status: "Rejected", decisionStatus: "Rejected"/);
  assert.match(
    app,
    /const forwardedStatuses: InvestigatorStatus\[\] = \["Active", "Approved", "Inactive"\]/,
  );
  assert.match(app, /const isRejected = selectedLoan\.loan\.decisionStatus === "Rejected"/);
  assert.match(app, /readOnly=\{isForwarded \|\| isRejected\}/);
  assert.match(app, /forwardedView=\{isForwarded\}/);
});

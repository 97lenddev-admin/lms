import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { coMakerRowToDetails } from "../src/app/credit-analyst/co-makers.ts";

test("maps a stored co-maker into read-only display details", () => {
  const coMaker = coMakerRowToDetails({
    loan_id: "loan-id",
    full_name: "Maria Santos",
    date_of_birth: "1990-01-02",
    civil_status: "Married",
    citizenship: "Filipino",
    gender: "Female",
    place_of_birth: "Manila",
    contact_number: "09170000000",
    email: "maria@example.com",
    relationship_to_borrower: "Sibling",
    home_address: "123 Main Street",
    present_address: "123 Main Street",
    present_address_status: "living_with_parents",
    barangay: "Central",
    city_town: "Manila",
    zip_code: "1000",
    region: "NCR",
    provincial_address: null,
    provincial_barangay: null,
    provincial_city_town: null,
    provincial_zip_code: null,
    provincial_region: null,
    number_of_children: 1,
    children: [{ Name: "Ana" }],
    businesses: [{ "Business name": "Santos Store" }],
    gross_monthly_income: 25000,
    overall_remarks: "Stable income",
  });

  assert.equal(coMaker.fullName, "Maria Santos");
  assert.equal(coMaker.presentAddressStatus, "Living with parents");
  assert.equal(coMaker.grossMonthlyIncome, "₱25,000.00");
  assert.deepEqual(coMaker.children, [{ Name: "Ana" }]);
});

test("credit analyst routes the Co-maker action to view or add", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/credit-analyst-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\? "Loading…" : loan\.coMaker \? "Co-maker" : "Add"/);
  assert.match(source, /loan\.coMaker \? "\/credit-analyst\/icons\/eye\.svg" : "\/credit-analyst\/icons\/user-plus\.svg"/);
  assert.match(source, /if \(loan\.coMaker\)/);
  assert.match(source, /type: "co-maker-view"/);
  assert.match(source, /desktopTitle="Co-maker details"/);
  assert.match(source, /loan\.coMaker \? "View co-maker" : "Add co-maker"/);
  assert.match(source, /getLoanCoMaker\(loan\.databaseId\)/);
  assert.match(source, /getLoanCoMakers\(loanIds\)/);
  assert.match(source, /result\.coMakers\[loan\.databaseId\]/);

  const detailsView = source.slice(
    source.indexOf("function CoMakerDetailsView"),
    source.indexOf("function DesktopSubmissionView"),
  );
  assert.match(detailsView, /ReadOnlyField/);
  assert.doesNotMatch(detailsView, /<FormField|<input|onValueChange/);

  const addForm = source.slice(
    source.indexOf("function DesktopCoMakerForm"),
    source.indexOf("function PaymentSchedule"),
  );
  assert.doesNotMatch(addForm, />Save draft</);
});

test("desktop dashboard expands before enabling horizontal table scroll", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/credit-analyst-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /max-w-\[1240px\]/);
  assert.match(source, /min-w-\[1072px\]/);
});

test("credit analyst confirms irreversible submissions with action-specific copy", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/credit-analyst-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /function SubmitConfirmationModal/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /title="Submit this application\?"/);
  assert.match(source, /confirmLabel="Submit application"/);
  assert.match(source, /title="Add this co-maker\?"/);
  assert.match(source, /confirmLabel="Add co-maker"/);
  assert.match(source, /The saved co-maker details will be read-only\. This cannot be undone\./);
  assert.match(source, /bg-\[#0a0a0a\]\/70/);
});

test("co-maker lookup matches the selected loan database id", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
    "utf8",
  );

  const lookup = source.slice(
    source.indexOf("export async function getLoanCoMaker"),
    source.indexOf("export async function createLoanApplication"),
  );
  assert.match(lookup, /\.from\("loan_co_makers"\)/);
  assert.match(lookup, /\.eq\("loan_id", loanId\)/);
  assert.match(lookup, /\.maybeSingle\(\)/);
});

test("dashboard refreshes co-makers in one loan_id query", () => {
  const source = readFileSync(
    new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
    "utf8",
  );

  const lookup = source.slice(
    source.indexOf("export async function getLoanCoMakers"),
    source.indexOf("export async function createLoanApplication"),
  );
  assert.match(lookup, /\.from\("loan_co_makers"\)/);
  assert.match(lookup, /\.in\("loan_id", uniqueLoanIds\)/);
  assert.match(lookup, /row\.loan_id/);
});

test("credit analysts can select visible co-maker rows through RLS", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261021000000_allow_credit_analysts_read_loan_co_makers.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /grant select on table public\.loan_co_makers to authenticated/);
  assert.match(migration, /for select\s+to authenticated/);
  assert.match(migration, /profile\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /profile\.roles = 'Credit Analyst'/);
});

test("credit analysts can insert but not edit co-maker rows through RLS", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261021001000_allow_credit_analysts_insert_loan_co_makers.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /grant select, insert on table public\.loan_co_makers to authenticated/);
  assert.match(migration, /for select\s+to authenticated\s+using/);
  assert.match(migration, /for insert\s+to authenticated\s+with check/);
  assert.match(migration, /profile\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /profile\.roles = 'Credit Analyst'/);
  assert.doesNotMatch(migration, /grant\s+(?:update|delete)|for\s+(?:update|delete)/i);
});

test("credit analysts can insert loan applications through RLS", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261021002000_allow_credit_analysts_insert_loans.sql", import.meta.url),
    "utf8",
  );
  const action = readFileSync(
    new URL("../src/app/credit-analyst/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /grant select, insert on table public\.loans to authenticated/);
  assert.match(migration, /for insert\s+to authenticated\s+with check/);
  assert.match(migration, /profile\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /profile\.roles = 'Credit Analyst'/);
  assert.doesNotMatch(migration, /grant\s+(?:update|delete)|for\s+(?:update|delete)/i);
  assert.match(action, /error\.code === "42501"/);
  assert.match(action, /database access policy is incomplete/);
});

test("credit analysts can read the loan row returned after insert", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261021003000_allow_credit_analysts_read_loans.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /grant select on table public\.loans to authenticated/);
  assert.match(migration, /for select\s+to authenticated\s+using/);
  assert.match(migration, /profile\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /profile\.roles = 'Credit Analyst'/);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)|for\s+(?:insert|update|delete)/i);
});

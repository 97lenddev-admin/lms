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

test("credit investigators can preview supporting documents and see additional fields", () => {
  const actions = readFileSync(
    new URL("../src/app/credit-investigator/actions.ts", import.meta.url),
    "utf8",
  );
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL("../supabase/migrations/20261106191500_allow_credit_investigators_read_application_documents.sql", import.meta.url),
    "utf8",
  );

  assert.match(actions, /export async function createLoanDocumentViewUrl/);
  assert.match(actions, /\.from\(loanDocumentBucket\)[\s\S]*\.createSignedUrl\(path, 60\)/);
  assert.match(app, /function SupportingDocument/);
  assert.match(app, /window\.open\("about:blank", "_blank"\)/);
  assert.match(app, /Open in new tab/);
  assert.equal((app.match(/<AdditionalFields fields=\{loan\.details\?\.additionalFields\} \/>/g) ?? []).length, 2);
  assert.match(migration, /for select\s+to authenticated/);
  assert.match(migration, /profile\.roles = 'Credit Investigator'/);
  assert.match(migration, /document ->> 'path' = storage\.objects\.name/);
  assert.match(migration, /from public\.loans as loan/);
  assert.match(migration, /loan\.claim_status = 'open'/);
  assert.match(migration, /loan\.claimed_by = \(select auth\.uid\(\)\)/);
});

test("credit investigators can open relevant applicant and co-maker details", () => {
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../src/app/credit-investigator/page.tsx", import.meta.url),
    "utf8",
  );
  const loans = readFileSync(
    new URL("../src/app/credit-investigator/loans.ts", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL("../supabase/migrations/20261107170000_allow_credit_investigators_read_relevant_details.sql", import.meta.url),
    "utf8",
  );

  assert.match(app, /function IdPicture\(/);
  assert.match(app, /function IdPictures\(/);
  assert.match(app, /Applicant 2x2 picture/);
  assert.match(app, /Co-maker 2x2 picture/);
  assert.match(app, /pictures\.filter\(picture => picture\.kind === "applicant_2x2"\)/);
  assert.match(app, /<Image unoptimized src=\{previewUrl\}/);
  assert.match(app, /window\.open\("about:blank", "_blank"\)/);
  assert.match(app, /pictures=\{loan\.details\?\.idPictures\}/);
  assert.match(app, /function RelevantDetailsScreen\(/);
  assert.match(app, />Relevant details<\/button>/);
  assert.match(app, /view-relevant-details/);
  assert.match(app, /title="Applicant"/);
  assert.match(app, /title="Co-maker"/);
  assert.match(page, /\.from\("loan_co_makers"\)\s*\.select\(coMakerColumns\)/);
  assert.match(page, /coMakerRowToDetails\(row\)/);
  assert.match(loans, /coMaker\?: CoMakerDetails/);
  assert.match(loans, /picture\.kind === "co_maker_2x2"/);
  assert.match(migration, /create policy "Credit investigators read loan co-makers"/);
  assert.match(migration, /loan\.id = loan_co_makers\.loan_id/);
  assert.match(migration, /loan\.id_pictures::jsonb/);
  assert.match(migration, /picture ->> 'kind' in \('applicant_2x2', 'co_maker_2x2'\)/);
  assert.match(migration, /picture ->> 'path' = storage\.objects\.name/);
  assert.match(migration, /profile\.roles = 'Credit Investigator'/);
  assert.match(migration, /loan\.claim_status = 'open'/);
  assert.match(migration, /loan\.claimed_by = \(select auth\.uid\(\)\)/);
});

test("investigation insurance disclosure is editable and plate number remains optional", () => {
  const analysis = readFileSync(
    new URL("../src/app/credit-investigator/analysis-pages.tsx", import.meta.url),
    "utf8",
  );
  const actions = readFileSync(
    new URL("../src/app/credit-investigator/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(analysis, /onChange=\{\(\) => update\("insurance", option\)\}/);
  assert.doesNotMatch(analysis, /name="insurance"[^>]*readOnly[^>]*disabled/);
  assert.match(analysis, /label="Plate no\. — optional"/);
  assert.match(analysis, /onChange=\{event => update\("plateNumber", event\.target\.value\)\}/);
  assert.doesNotMatch(analysis, /label="Plate no\.[^\n]*required/);
  assert.match(actions, /p_insurance_and_deposit_disclosure: \{\s*selected_option: input\.insurance\.trim\(\)\.slice\(0, 200\) \|\| null/);
  assert.match(actions, /p_plate_no: input\.plateNumber\.trim\(\)\.slice\(0, 100\) \|\| null/);
});

test("forwarded submissions retain the freshly saved investigation values", () => {
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );
  const loans = readFileSync(
    new URL("../src/app/credit-investigator/loans.ts", import.meta.url),
    "utf8",
  );

  assert.match(app, /type ForwardedAnalysisSnapshot = \{/);
  assert.match(app, /onForwarded\?\.\(\{ analysisData, investigationId: investigationId \?\? undefined, completedAnalyses, investigationReportSubmittedAt: investigationSubmittedAt \}\)/);
  assert.match(app, /onForwarded=\{snapshot => \{ setMyLoans\(current => current\.map\(item => item\.id === selectedLoan\.loan\.id \? \{ \.\.\.item, \.\.\.snapshot, status: "Active", decisionStatus: "Active" \}/);
  assert.match(loans, /observations: text\(investigation\.computations_comments_observations\)/);
  assert.match(loans, /pendingRequirements: text\(investigation\.other_pending_requirements\)/);
  assert.match(loans, /plateNumber: text\(investigation\.plate_no\)/);
  assert.match(loans, /insurance: text\(insurance\.selected_option\)/);
});

test("all analysis tab saves require confirmation", () => {
  const analysis = readFileSync(
    new URL("../src/app/credit-investigator/analysis-pages.tsx", import.meta.url),
    "utf8",
  );

  assert.match(analysis, /function SaveConfirmationDialog\(/);
  assert.match(analysis, /role="dialog" aria-modal="true"/);
  assert.match(analysis, /Save \{pageLabel\}\?/);
  assert.match(analysis, /useState<"back" \| "continue" \| null>\(null\)/);
  assert.match(analysis, /const saveAndBack = \(\) => setSaveConfirmation\("back"\)/);
  assert.match(analysis, /const saveAndContinue = \(\) => setSaveConfirmation\("continue"\)/);
  assert.match(analysis, /saveConfirmation && <SaveConfirmationDialog pageLabel=\{current\.label\}/);
  assert.match(analysis, /onCancel=\{\(\) => setSaveConfirmation\(null\)\} onConfirm=\{confirmSave\}/);
});

test("claiming a submission requires confirmation", () => {
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(app, /function ClaimConfirmationDialog\(/);
  assert.match(app, /Claim this submission\?/);
  assert.match(app, /const \[claimConfirmationOpen, setClaimConfirmationOpen\] = useState\(false\)/);
  assert.match(app, /onClick=\{\(\) => setClaimConfirmationOpen\(true\)\}/);
  assert.match(app, /setClaimConfirmationOpen\(false\);\s*setClaiming\(true\)/);
  assert.match(app, /claimConfirmationOpen && <ClaimConfirmationDialog loan=\{loan\}/);
  assert.match(app, /onCancel=\{\(\) => setClaimConfirmationOpen\(false\)\} onConfirm=\{\(\) => void handleClaim\(\)\}/);
});

test("disclosure statement print and PDF export controls open the browser print flow", () => {
  const analysis = readFileSync(
    new URL("../src/app/credit-investigator/analysis-pages.tsx", import.meta.url),
    "utf8",
  );
  const navigation = readFileSync(
    new URL("../src/app/credit-analyst/navigation.tsx", import.meta.url),
    "utf8",
  );

  assert.match(analysis, /const printDisclosure = \(\) => window\.print\(\)/);
  assert.match(analysis, /onClick=\{printDisclosure\}[^>]*>[\s\S]*?Print \/ export PDF/);
  assert.match(analysis, /page === "disclosure" \? printDisclosure : saveAndBack/);
  assert.match(analysis, /page === "disclosure" \? printDisclosure : saveAndContinue/);
  assert.match(analysis, /print:hidden/);
  assert.match(analysis, /print:!ml-0/);
  assert.match(navigation, /print:!hidden/);
});

test("investigation submission record uses the signed-in profile and stored submission date", () => {
  const analysis = readFileSync(
    new URL("../src/app/credit-investigator/analysis-pages.tsx", import.meta.url),
    "utf8",
  );
  const app = readFileSync(
    new URL("../src/app/credit-investigator/credit-investigator-app.tsx", import.meta.url),
    "utf8",
  );
  const loans = readFileSync(
    new URL("../src/app/credit-investigator/loans.ts", import.meta.url),
    "utf8",
  );

  assert.match(analysis, /\{submissionRecord\.name\}<\/strong> · \{submissionRecord\.role\} ·/);
  assert.match(analysis, /new Intl\.DateTimeFormat\("en-US"/);
  assert.doesNotMatch(analysis, /San Jose, Maria|Mar 5, 2026/);
  assert.match(app, /name: userProfile\.fullName, role: userProfile\.role, date: investigationSubmittedAt/);
  assert.match(app, /setInvestigationSubmittedAt\(new Date\(\)\.toISOString\(\)\)/);
  assert.match(app, /\{submissionPreviewDate\} · \{userProfile\.role\} · \{userProfile\.fullName\}/);
  assert.match(app, /\{loan\.submitted\} · \{userProfile\.role\} · \{userProfile\.fullName\}/);
  assert.doesNotMatch(app, /Submitted \{loan\.submitted\} by \{loan\.submittedBy\} · Caloocan Branch/);
  assert.match(app, /const submissionPreviewDate = new Intl\.DateTimeFormat\("en-US"/);
  assert.match(loans, /investigationReportSubmittedAt: investigation\.investigation_report_submited_date \|\| undefined/);
});

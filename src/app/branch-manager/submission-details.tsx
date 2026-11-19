"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { documents, submissions as originalLoans, type Submission } from "../credit-analyst/data";
import { AnalysisWorkspace, defaultAnalysisData, type AnalysisData, type AnalysisPage } from "../credit-investigator/analysis-pages";
import { approveLoan, createLoanDocumentViewUrl, rejectLoan, returnLoanToCi, updateLoanTerms } from "./actions";
import { productKey } from "./advance-filters";
import ActionDialog from "./action-dialog";
import styles from "./branch-manager.module.css";

// Figma sample records, alongside the masterlist's existing demo data.
// Unavailable fields on other records are deliberately left unspecified.
const detailSamples: Record<string, {
  birth: string; contact: string; address: string; coMaker?: string;
  purpose: string; business: string; income: string; note: string;
  recommended: string; completed: string[]; decisionDate?: string; firstDue: string;
}> = {
  "LN-0023": {
    birth: "04/12/1991", contact: "0917 123 4567", address: "42 Samson Road, Caloocan City",
    coMaker: "Santos, Roberto D", purpose: "Working capital for hardware stock replenishment.",
    business: "Reyes Hardware Supply", income: "₱45,000.00",
    note: "Verified business permit matches address on file.", recommended: "₱60,000",
    completed: ["Mar 10, 2026", "Mar 10, 2026", "Mar 11, 2026", "Mar 11, 2026"],
    decisionDate: "Mar 18, 2026", firstDue: "2026-06-24",
  },
  "LN-0142": {
    birth: "08/09/1988", contact: "+63 918 442 7761", address: "12 Bagong Silang Road, Caloocan City",
    purpose: "Additional stock for rice and grocery retail.", business: "Garcia Rice Trading", income: "₱38,000.00",
    note: "Business verified at address; stock levels consistent with declared sales.", recommended: "₱50,000.00",
    completed: ["Jul 28, 2025", "Jul 28, 2025", "Jul 29, 2025", "Jul 29, 2025"], firstDue: "2025-07-24",
  },
};
const artifacts: { title: string; page: AnalysisPage }[] = [
  { title: "Investigation report", page: "investigation" },
  { title: "Cash flow analysis", page: "cashflow" },
  { title: "Collateral analysis", page: "collateral" },
  { title: "Disclosure statement", page: "disclosure" },
];
const completedAnalysisPages = artifacts.map(artifact => artifact.page);
const paymentPlaceholder = { firstDue: "2026-06-24", count: 60, amount: 1108 } as const;
const money = (value: number) => `₱${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (date: Date, year = true) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } as const : {}), timeZone: "UTC" });
const storedDateLabel = (value?: string) => value ? dateLabel(new Date(value)) : undefined;
const joinedAddress = (...parts: (string | undefined)[]) => parts.map(part => part?.trim()).filter(Boolean).join(", ") || undefined;

export type BranchManagerInvestigation = {
  analysisData: AnalysisData;
  completedAnalyses: AnalysisPage[];
  completedDates: Partial<Record<AnalysisPage, string>>;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.infoSection}><h2>{title}</h2>{children}</section>;
}

function SupportingDocumentRow({ file, submitted, editing = false }: {
  file: { name: string; size: string; path?: string };
  submitted: string;
  editing?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const openDocument = async () => {
    if (!file.path || pending) return;
    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    setPending(true);
    setError("");
    const result = await createLoanDocumentViewUrl(file.path);
    setPending(false);
    if (!result.ok) {
      preview?.close();
      setError(result.error);
      return;
    }
    if (preview) preview.location.href = result.url;
    else window.open(result.url, "_blank", "noopener,noreferrer");
  };

  return <div>
    <div className={`${styles.fileRow} ${styles.artifactRow}`}>
      <Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} />
      <div><strong>{file.name}</strong>{!editing && <p>{file.size} · Uploaded {submitted}</p>}</div>
      <button type="button" className={styles.button} disabled={!file.path || pending} onClick={() => void openDocument()} aria-label={`View ${file.name}`} title={file.path ? undefined : "Preview unavailable for older uploads"}>{pending ? "Opening…" : "View"}</button>
    </div>
    {error && <p role="alert" className={styles.documentError}>{error}</p>}
  </div>;
}
function Field({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return <div className={`${styles.readField} ${wide ? styles.wideField : ""}`}><dt>{label}</dt><dd title={value} className={label === "Purpose of loan" ? styles.multilineValue : undefined}>{value || "Not provided"}</dd></div>;
}

function PaymentSchedule({ firstDue, count = 60, amount = 1108 }: { firstDue?: string; count?: number; amount?: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAll, setShowAll] = useState(false);
  if (!firstDue) return <p className={styles.unavailable}>Payment schedule is not available for this submission.</p>;
  const payments = Array.from({ length: count }, (_, index) => {
    const date = new Date(`${firstDue}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { number: String(index + 1).padStart(3, "0"), date, amount };
  });
  const months = new Map<string, typeof payments>();
  for (const payment of payments) {
    const month = payment.date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    months.set(month, [...(months.get(month) ?? []), payment]);
  }
  const pageCount = Math.ceil(payments.length / pageSize);
  const paymentList = (rows: typeof payments) => rows.map(payment => <div className={styles.paymentRow} key={payment.number}><span>{payment.number} · {dateLabel(payment.date, false)}</span><strong>{money(payment.amount)}</strong></div>);
  return <>
    <div className={styles.desktopSchedule}>
      <table><thead><tr><th>Payment no.</th><th>Due date</th><th>Amount</th></tr></thead><tbody>{payments.slice((page - 1) * pageSize, page * pageSize).map(payment => <tr key={payment.number}><td>{payment.number}</td><td>{dateLabel(payment.date)}</td><td>{money(payment.amount)}</td></tr>)}</tbody></table>
      <div className={`${styles.pagination} ${styles.schedulePagination}`}><span>Page {page} of {pageCount}</span><select aria-label="Payments per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 30].map(size => <option key={size} value={size}>{size} per page</option>)}</select><div><button className={styles.button} disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className={styles.button} disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </div>
    <div className={styles.mobileSchedule}>
      <div className={styles.paymentSummary}><p>Per payment</p><strong>{money(amount)}</strong><span>60 payments · daily · {money(66480)} total</span></div>
      <dl className={styles.dueDates}><div><dt>First due</dt><dd>{dateLabel(payments[0].date)}</dd></div><div><dt>Final due</dt><dd>{dateLabel(payments.at(-1)!.date)}</dd></div></dl>
      <h3>By month</h3><div className={styles.months}>{Array.from(months, ([month, rows], index) => <details key={month} open={index === 0}><summary><span><strong>{month}</strong><small>{rows.length} payments</small></span><strong>{money(rows.length * amount)}</strong><span className={styles.monthToggle} aria-hidden="true" /></summary>{paymentList(rows)}</details>)}</div>
      <button className={`${styles.button} ${styles.showPayments}`} aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Hide all payments" : `Show all ${count} payments`}</button>
      {showAll && <div className={styles.allPayments}>{paymentList(payments)}</div>}
    </div>
  </>;
}

export default function SubmissionDetails({ loan, investigation, badge, submittedBy, onBack, editing = false, backLabel = "masterlist", products = [], onSave, onApprove, onReject, onReturn }: {
  editing?: boolean; backLabel?: string; products?: Submission[]; onSave?: (loan: Submission) => void; onApprove?: (loan: Submission) => void; onReject?: (loan: Submission) => void; onReturn?: (loan: Submission) => void;
  loan: Submission; investigation?: BranchManagerInvestigation; badge: ReactNode; submittedBy: string; onBack: () => void;
}) {
  const [product, setProduct] = useState(productKey(loan));
  const chosen = products.find(row => productKey(row) === product) ?? loan;
  const displayLoan = editing ? { ...loan, amount: chosen.amount, term: chosen.term } : loan;
  const original = originalLoans.find(row => row.id === loan.id);
  const scheduleAvailable = original && original.amount === displayLoan.amount && (loan.id === "LN-0142" ? "60 days" : original.term) === displayLoan.term;
  const sample = detailSamples[loan.id];
  const supportingDocuments = loan.details?.supportingDocuments ?? [];
  const businesses = loan.details?.businesses ?? [];
  const clientAddress = joinedAddress(
    loan.details?.permanentAddress,
    loan.details?.permanentBarangay,
    loan.details?.permanentCityTown,
    loan.details?.permanentZipcode,
    loan.details?.permanentRegion,
  );
  const clientPresentAddress = loan.details?.presentAddress;
  const coMaker = loan.coMaker;
  const coMakerName = coMaker?.fullName;
  const coMakerHomeAddress = coMaker ? joinedAddress(coMaker.homeAddress, coMaker.barangay, coMaker.cityTown, coMaker.zipCode, coMaker.region) : undefined;
  const coMakerProvincialAddress = coMaker ? joinedAddress(coMaker.provincialAddress, coMaker.provincialBarangay, coMaker.provincialCityTown, coMaker.provincialZipCode, coMaker.provincialRegion) : undefined;
  const active = loan.status === "Active";
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "return" | "save" | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [analysisPage, setAnalysisPage] = useState<AnalysisPage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (notice) dialog.current?.showModal(); }, [notice]);
  if (analysisPage) {
    const analysisData = investigation?.analysisData ?? {
      ...defaultAnalysisData,
      recommendedAmount: sample?.recommended ?? loan.amount,
      businessStatus: "Operating",
      observations: sample?.note ?? "Field investigation completed and forwarded for Branch Manager review.",
    };
    return <div className="[&_footer]:hidden">
      <AnalysisWorkspace
        page={analysisPage}
        loanId={loan.id}
        applicant={loan.name}
        loanAmount={loan.amount}
        business={{ name: loan.details?.businesses?.[0]?.["Business name"] ?? sample?.business, type: loan.details?.businesses?.[0]?.Type ?? "Retail", address: loan.details?.businesses?.[0]?.Address ?? loan.details?.permanentCityTown, years: loan.details?.businesses?.[0]?.Years }}
        data={analysisData}
        setData={() => undefined}
        completed={investigation?.completedAnalyses ?? completedAnalysisPages}
        submissionRecord={{ name: "San Jose, Maria", role: "Credit Investigator", date: investigation?.completedDates[analysisPage] ?? sample?.completed[0] ?? loan.submitted }}
        onSave={async () => ({ success: true })}
        onBack={() => setAnalysisPage(null)}
        onNavigate={setAnalysisPage}
        onReject={() => undefined}
        cashFlowReadOnly
        readOnlyMode
      />
    </div>;
  }
  const amount = displayLoan.amount.replace(/\.00$/, "");
  const dynamicRecommendation = investigation?.analysisData.recommendedAmount;
  const ciRecommended = dynamicRecommendation ? money(Number(dynamicRecommendation.replace(/[^0-9.]/g, ""))) : sample?.recommended ?? "Not available";
  const currentProduct = productKey(loan);
  const newProduct = productKey(displayLoan);
  const appliedNumber = Number(displayLoan.amount.replace(/[^0-9.]/g, ""));
  const recommendedNumber = Number(ciRecommended.replace(/[^0-9.]/g, ""));
  const variance = appliedNumber > recommendedNumber ? money(appliedNumber - recommendedNumber) : "the CI recommendation";
  const actionProps = action === "approve" ? {
    title: "Approve this loan application?",
    description: `${loan.id} — ${loan.name} will be approved at ${displayLoan.amount} / ${displayLoan.term} — ${variance} above the ${ciRecommended} recommended by San Jose, Maria (CI). J. Santos (CA) and the cashier will be notified, and the loan moves to release.`,
    mobileDescription: `${loan.id} — ${loan.name} will be approved at ${amount} / ${displayLoan.term} — above the ${ciRecommended} recommended by San Jose, Maria (CI). J. Santos (CA) and the cashier will be notified.`,
    confirmLabel: "Approve loan",
    rows: [{ label: "Loan amount", value: amount }, { label: "Term", value: displayLoan.term }, { label: "CI recommended", value: ciRecommended }],
    noteLabel: "Reason for approving above the CI recommendation (required)",
    notePlaceholder: "Explain the variance for the record",
    noteRequired: true,
  } : action === "reject" ? {
    title: "Reject this application?",
    description: `${loan.id} — ${loan.name} will be rejected. J. Santos (CA) and San Jose, Maria (CI) will be notified and the application closes. This cannot be undone.`,
    confirmLabel: "Reject application",
    choiceLabel: "Reason (required)",
    choices: [
      { value: "Failed credit investigation", label: "Failed credit investigation" },
      { value: "Undisclosed lending discovered", label: "Undisclosed lending discovered" },
      { value: "Insufficient capacity to repay", label: "Insufficient capacity to repay" },
      { value: "Other", label: "Other" },
    ],
    defaultChoice: "Failed credit investigation",
    noteLabel: "Additional detail (optional)",
    notePlaceholder: "Add detail for the record",
    dangerHeading: true,
  } : action === "return" ? {
    title: "Return this application to the CI?",
    description: `${loan.id} — ${loan.name} will be sent back to San Jose, Maria (CI) for follow-up. It leaves your approval queue until the CI forwards it again.`,
    confirmLabel: "Return to CI",
    rows: [{ label: "Loan amount", value: amount }, { label: "Investigated by", value: "San Jose, Maria" }, { label: "Forwarded", value: sample?.completed.at(-1) ?? loan.submitted }],
    noteLabel: "What needs revisiting? (required)",
    notePlaceholder: "Tell the CI what to re-check",
    noteRequired: true,
  } : action === "save" ? {
    title: "Save changes to this application?",
    description: `The loan product on ${loan.id} — ${loan.name} will change from ${currentProduct} to ${newProduct}. J. Santos (CA) will be notified, and the change is recorded in the activity log.`,
    mobileDescription: `The loan product on ${loan.id} — ${loan.name} will change. J. Santos (CA) will be notified, and the change is recorded in the activity log.`,
    confirmLabel: "Save changes",
    rows: [{ label: "Current product", value: currentProduct }, { label: "New product", value: newProduct }, { label: "New daily amount", value: newProduct.includes("100,000") && newProduct.includes("90") ? "₱1,032.89" : "Calculated at release" }],
    noteLabel: "Reason for the change (optional)",
    notePlaceholder: "Add a note for the credit analyst",
  } : null;
  return <main className={`${styles.main} ${styles.detailMain} ${editing ? styles.editMain : ""}`}>
    <header className={styles.submissionHeader}>
      {editing ? <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><button onClick={onBack}>Advance Filter</button><span>&rsaquo;</span><button onClick={onBack}>{loan.id}</button><span>&rsaquo;</span><span>Edit</span></nav> : <button className={styles.backButton} onClick={onBack}><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} />Back to {backLabel}</button>}
      <div className={styles.submissionTitle}><h1 tabIndex={-1} ref={heading}>{editing ? loan.name : `${loan.id} \u2014 ${loan.name}`}</h1>{badge}</div>
      {!editing && <p>Caloocan Branch<span className={styles.branchSeparator}> · </span><span className={styles.submissionMeta}>Submitted {loan.submitted} by {submittedBy}</span></p>}
    </header>
    <div className={styles.detailCard}>
      <Section title="Client information"><dl className={styles.fieldGrid}><Field label="Full name" value={loan.name} /><Field label="Date of birth" value={loan.details?.dateOfBirth} /><Field label="Civil status" value={loan.details?.civilStatus} /><Field label="Citizenship" value={loan.details?.citizenship} /><Field label="Gender" value={loan.details?.gender} /><Field label="Place of birth" value={loan.details?.placeOfBirth} /><Field label="Contact number" value={loan.details?.contactNumber} /><Field label="Email / Facebook address" value={loan.details?.emailFacebookAddress} /><Field label="Number of children" value={loan.details?.numberOfChildren} /><Field label="Permanent address" value={clientAddress} wide /><Field label="Present address" value={clientPresentAddress} wide />{editing && <Field label="Submitted by" value={submittedBy} />}</dl></Section>
      <Section title="Co-maker"><dl className={styles.fieldGrid}><Field label="Co-maker" value={coMakerName ?? (loan.hasCoMaker ? "Details not provided" : "None added")} wide={!coMakerName} />{coMaker && <><Field label="Relation to borrower" value={coMaker.relationshipToBorrower} /><Field label="Date of birth" value={coMaker.dateOfBirth} /><Field label="Civil status" value={coMaker.civilStatus} /><Field label="Citizenship" value={coMaker.citizenship} /><Field label="Gender" value={coMaker.gender} /><Field label="Place of birth" value={coMaker.placeOfBirth} /><Field label="Contact number" value={coMaker.contactNumber} /><Field label="Email" value={coMaker.email} /><Field label="Present address status" value={coMaker.presentAddressStatus} /><Field label="Number of children" value={coMaker.numberOfChildren} /><Field label="Gross monthly income" value={coMaker.grossMonthlyIncome} /><Field label="Home address" value={coMakerHomeAddress} wide /><Field label="Present address" value={coMaker.presentAddress} wide /><Field label="Provincial address" value={coMakerProvincialAddress} wide />{coMaker.children.map((child, index) => <Field key={`co-child-${index}`} label={`Child ${index + 1}`} value={[child.Name, child.School, child["Grade/Course"], child.Birthday, child.Age].filter(Boolean).join(" · ")} wide />)}{coMaker.businesses.map((business, index) => <Field key={`co-business-${index}`} label={`Co-maker business ${index + 1}`} value={[business["Business name"], business.Type, business.Address, business.Years && `${business.Years} years`].filter(Boolean).join(" · ")} wide />)}<Field label="Overall remarks" value={coMaker.overallRemarks} wide /></>}</dl></Section>
      <Section title="Loan details"><dl className={styles.fieldGrid}><>{editing ? <div className={styles.readField}><dt><label htmlFor="edit-product">Loan product<span className={styles.editableLabel}> (editable)</span></label></dt><dd className={styles.productInput}><select id="edit-product" value={product} onChange={e => setProduct(e.target.value)}>{[...new Set([productKey(loan), ...products.map(productKey)])].map(value => <option key={value}>{value}</option>)}</select></dd></div> : <Field label="Loan product" value={productKey(loan)} />}</><Field label="Loan amount" value={displayLoan.amount.replace(/\.00$/, "")} /><Field label="Term" value={displayLoan.term} />{editing && <p className={styles.editHint}>Only the loan product can be changed here. All other fields are read-only.</p>}<Field label="Purpose of loan" value={loan.details?.purposeOfLoan} wide /></dl></Section>
      <Section title="Employment/business">{businesses.length ? businesses.map((business, index) => <dl className={styles.fieldGrid} key={`business-${index}`}><Field label={`Business ${index + 1} name`} value={business["Business name"]} /><Field label="Business type" value={business.Type} /><Field label="Years operating" value={business.Years} /><Field label="Business address" value={business.Address} wide /></dl>) : <p className={styles.unavailable}>No business details provided.</p>}<dl className={styles.fieldGrid}><Field label="Gross monthly income" value={loan.details?.grossMonthlyIncome} /></dl></Section>
      <Section title="Supporting documents"><div className={styles.fileList}>{supportingDocuments.length ? <>{supportingDocuments.map(file => <SupportingDocumentRow key={`${file.path ?? file.name}-${file.name}`} file={file} submitted={loan.submitted} editing={editing} />)}{!editing && sample?.note && <div className={styles.fileRow}><Image src="/branch-manager/text-input.svg" alt="" width={20} height={20} /><div><div className={styles.fileTitle}><strong>Note</strong><span className={`${styles.badge} ${styles.approved}`}>Added by CI</span></div><p>&quot;{sample.note}&quot;</p></div></div>}</> : sample ? <>{documents.map(file => <SupportingDocumentRow key={file.name} file={{ name: file.name, size: file.meta.split(" · ")[0] }} submitted={loan.submitted} editing={editing} />)}{!editing && <div className={styles.fileRow}><Image src="/branch-manager/text-input.svg" alt="" width={20} height={20} /><div><div className={styles.fileTitle}><strong>Note</strong><span className={`${styles.badge} ${styles.approved}`}>Added by CI</span></div><p>&quot;{sample.note}&quot;</p></div></div>}</> : <p className={styles.unavailable}>No supporting documents available.</p>}</div></Section>
      {!editing && <Section title="Credit investigation"><dl className={styles.fieldGrid}><Field label="Investigated by" value={sample || investigation || loan.status === "Active" ? "San Jose, Maria (CI)" : undefined} /><Field label="Amount applied" value={loan.amount.replace(/\.00$/, "")} /><Field label="CI recommended amount" value={dynamicRecommendation ? money(Number(dynamicRecommendation.replace(/[^0-9.]/g, ""))) : sample?.recommended ?? (loan.status === "Active" ? loan.amount.replace(/\.00$/, "") : undefined)} /></dl><div className={styles.fileList}>{sample || investigation || loan.status === "Active" ? artifacts.map((artifact, index) => { const completedDate = storedDateLabel(investigation?.completedDates[artifact.page]) ?? sample?.completed[index] ?? loan.submitted; return <div className={`${styles.fileRow} ${styles.artifactRow}`} key={artifact.page}><Image src="/branch-manager/text-input.svg" alt="" width={20} height={20} /><div><div className={styles.fileTitle}><strong>{artifact.title}</strong><span className={`${styles.badge} ${styles.active}`}>Completed</span></div><p>Completed {completedDate} · San Jose, Maria (CI)</p></div><button className={styles.button} aria-label={`View ${artifact.title.toLowerCase()}`} onClick={() => loan.status === "Active" ? setAnalysisPage(artifact.page) : setNotice({ title: artifact.title, message: `Completed ${completedDate} by San Jose, Maria (CI). The full report is available after this submission becomes active.` })}>View</button></div>; }) : <p className={styles.unavailable}>No investigation reports available.</p>}</div></Section>}
      {!editing && !active && <Section title="Decision"><dl className={styles.fieldGrid}><Field label="Decision" value={loan.status === "Rejected" ? "Rejected" : loan.status === "Approved" ? "Approved" : loan.status === "Pending" && loan.revisionDetails ? "Returned to CI" : undefined} /><Field label="Decided by" value={sample?.decisionDate ? "Jose Rizal (Branch Manager)" : undefined} /><Field label="Decision date" value={sample?.decisionDate} />{loan.status === "Rejected" && <><Field label="Reason for rejection" value={loan.rejectionReason} /><Field label="Additional detail" value={loan.rejectionAdditionalDetails} wide /></>}{loan.status === "Pending" && loan.revisionDetails && <Field label="Revision details" value={loan.revisionDetails} wide />}</dl></Section>}
      {!editing && <Section title="Projected payment schedule"><PaymentSchedule {...paymentPlaceholder} firstDue={scheduleAvailable ? sample?.firstDue : paymentPlaceholder.firstDue} /></Section>}
    </div>
    {editing && <><section className={styles.editSchedule}><h2>Projected Payment Schedule <span>{parseInt(displayLoan.term)} payments</span></h2><PaymentSchedule key={product} firstDue={scheduleAvailable ? sample?.firstDue : undefined} /></section><footer className={styles.editActions}><button className={styles.button} onClick={onBack}>Cancel</button><button className={`${styles.button} ${styles.approveButton}`} onClick={() => setAction("save")}>Save changes</button></footer></>}
    {!editing && active && <footer className={styles.decisionActions}><button className={styles.button} onClick={() => setAction("reject")}>Reject</button><button className={styles.button} onClick={() => setAction("return")}>Return to CI</button><button className={`${styles.button} ${styles.approveButton}`} onClick={() => setAction("approve")}>Approve loan</button></footer>}
    {actionProps && <ActionDialog open={Boolean(action)} {...actionProps} busy={actionPending} busyLabel={action === "reject" ? "Rejecting…" : action === "return" ? "Returning…" : action === "save" ? "Saving…" : "Approving…"} error={actionError} onClose={() => { if (!actionPending) { setAction(null); setActionError(""); } }} onConfirm={async ({ choice, note }) => {
      if (action === "save") {
        if (!loan.databaseId) {
          setActionError("This loan is unavailable in the database.");
          return;
        }
        setActionPending(true);
        setActionError("");
        let result: Awaited<ReturnType<typeof updateLoanTerms>>;
        try {
          result = await updateLoanTerms(loan.databaseId, displayLoan.amount, displayLoan.term, note);
        } catch (error) {
          console.error("[branch-manager] Loan edit request failed", error);
          setActionPending(false);
          setActionError("The save request failed. Please try again.");
          return;
        }
        setActionPending(false);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        onSave?.(displayLoan);
        return;
      }
      if (action === "approve") {
        if (!loan.databaseId) {
          setActionError("This loan is unavailable in the database.");
          return;
        }
        setActionPending(true);
        setActionError("");
        let result: Awaited<ReturnType<typeof approveLoan>>;
        try {
          result = await approveLoan(loan.databaseId, note);
        } catch (error) {
          console.error("[branch-manager] Approval request failed", error);
          setActionPending(false);
          setActionError("The approval request failed. Please try again.");
          return;
        }
        setActionPending(false);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        const approvedLoan = { ...loan, status: "Approved" as const };
        onApprove?.(approvedLoan);
        setAction(null);
        setNotice({ title: "Loan approved", message: "The approval reason was saved and the loan status is now Approved." });
        return;
      }
      if (action === "reject") {
        if (!loan.databaseId) {
          setActionError("This loan is unavailable in the database.");
          return;
        }
        if (!choice) {
          setActionError("Select a reason for rejection.");
          return;
        }
        setActionPending(true);
        setActionError("");
        let result: Awaited<ReturnType<typeof rejectLoan>>;
        try {
          result = await rejectLoan(loan.databaseId, choice, note);
        } catch (error) {
          console.error("[branch-manager] Rejection request failed", error);
          setActionPending(false);
          setActionError("The rejection request failed. Please try again.");
          return;
        }
        setActionPending(false);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        const rejectedLoan = {
          ...loan,
          status: "Rejected" as const,
          rejectionReason: choice,
          rejectionAdditionalDetails: note || undefined,
        };
        onReject?.(rejectedLoan);
        setAction(null);
        setNotice({ title: "Application rejected", message: "The rejection reason was saved and the loan status is now Rejected." });
        return;
      }
      if (action === "return") {
        if (!loan.databaseId) {
          setActionError("This loan is unavailable in the database.");
          return;
        }
        setActionPending(true);
        setActionError("");
        let result: Awaited<ReturnType<typeof returnLoanToCi>>;
        try {
          result = await returnLoanToCi(loan.databaseId, note);
        } catch (error) {
          console.error("[branch-manager] Return-to-CI request failed", error);
          setActionPending(false);
          setActionError("The return request failed. Please try again.");
          return;
        }
        setActionPending(false);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        const returnedLoan = {
          ...loan,
          status: "Pending" as const,
          revisionDetails: note,
        };
        onReturn?.(returnedLoan);
        setAction(null);
        setNotice({ title: "Returned to CI", message: "The revision details were saved and the loan status is now Pending." });
      }
    }} />}
    <dialog ref={dialog} className={styles.details} aria-labelledby="detail-notice-title" onClose={() => setNotice(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className={styles.detailHeader}><h2 id="detail-notice-title">{notice?.title}</h2><button className={styles.button} onClick={() => dialog.current?.close()}>Close</button></div><p>{notice?.message}</p></dialog>
  </main>;
}

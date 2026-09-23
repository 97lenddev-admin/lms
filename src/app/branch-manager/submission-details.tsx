"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { documents, submissions as originalLoans, type Submission } from "../credit-analyst/data";
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
const artifacts = ["Investigation report", "Cash flow analysis", "Collateral analysis", "Disclosure statement"];
const money = (value: number) => `₱${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (date: Date, year = true) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } as const : {}), timeZone: "UTC" });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.infoSection}><h2>{title}</h2>{children}</section>;
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

export default function SubmissionDetails({ loan, badge, submittedBy, onBack, editing = false, backLabel = "masterlist", products = [], onSave }: {
  editing?: boolean; backLabel?: string; products?: Submission[]; onSave?: (loan: Submission) => void;
  loan: Submission; badge: ReactNode; submittedBy: string; onBack: () => void;
}) {
  const [product, setProduct] = useState(productKey(loan));
  const chosen = products.find(row => productKey(row) === product) ?? loan;
  const displayLoan = editing ? { ...loan, amount: chosen.amount, term: chosen.term } : loan;
  const original = originalLoans.find(row => row.id === loan.id);
  const scheduleAvailable = original && original.amount === displayLoan.amount && (loan.id === "LN-0142" ? "60 days" : original.term) === displayLoan.term;
  const sample = detailSamples[loan.id];
  const pending = loan.status === "Pending";
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "return" | "save" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (notice) dialog.current?.showModal(); }, [notice]);
  const amount = displayLoan.amount.replace(/\.00$/, "");
  const ciRecommended = sample?.recommended ?? "Not available";
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
      { value: "failed-investigation", label: "Failed credit investigation" },
      { value: "undisclosed-lending", label: "Undisclosed lending discovered" },
      { value: "capacity", label: "Insufficient capacity to repay" },
      { value: "other", label: "Other" },
    ],
    defaultChoice: "failed-investigation",
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
      <Section title="Client information"><dl className={styles.fieldGrid}><Field label="Full name" value={loan.name} /><Field label="Date of birth" value={sample?.birth} /><Field label="Contact number" value={sample?.contact} /><Field label="Permanent address" value={sample?.address} wide={!editing} />{editing && <Field label="Submitted by" value={submittedBy} />}</dl></Section>
      <Section title="Co-maker"><dl className={styles.fieldGrid}><Field label="Co-maker" value={sample?.coMaker || (loan.hasCoMaker ? "Details not provided" : "None added")} wide={!sample?.coMaker} />{sample?.coMaker && <><Field label="Relation to borrower" value="Sibling" /><Field label="Added" value={`By ${submittedBy} on ${loan.submitted}`} /></>}</dl></Section>
      <Section title="Loan details"><dl className={styles.fieldGrid}><>{editing ? <div className={styles.readField}><dt><label htmlFor="edit-product">Loan product<span className={styles.editableLabel}> (editable)</span></label></dt><dd className={styles.productInput}><select id="edit-product" value={product} onChange={e => setProduct(e.target.value)}>{[...new Set([productKey(loan), ...products.map(productKey)])].map(value => <option key={value}>{value}</option>)}</select></dd></div> : <Field label="Loan product" value={productKey(loan)} />}</><Field label="Loan amount" value={displayLoan.amount.replace(/\.00$/, "")} /><Field label="Term" value={displayLoan.term} />{editing && <p className={styles.editHint}>Only the loan product can be changed here. All other fields are read-only.</p>}<Field label="Purpose of loan" value={sample?.purpose} wide /></dl></Section>
      <Section title="Employment/business"><dl className={styles.fieldGrid}><Field label="Business name" value={sample?.business} /><Field label="Business type" value={sample ? "Retail" : undefined} /><Field label="Gross monthly income" value={sample?.income} /></dl></Section>
      <Section title="Supporting documents"><div className={styles.fileList}>{sample ? <>{documents.map(file => <div className={styles.fileRow} key={file.name}><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div><strong>{file.name}</strong>{!editing && <p>{file.meta.split(" · ")[0]} · Uploaded {loan.submitted}</p>}</div></div>)}{!editing && <div className={styles.fileRow}><Image src="/branch-manager/text-input.svg" alt="" width={20} height={20} /><div><div className={styles.fileTitle}><strong>Note</strong><span className={`${styles.badge} ${styles.approved}`}>Added by CI</span></div><p>&quot;{sample.note}&quot;</p></div></div>}</> : <p className={styles.unavailable}>No supporting documents available.</p>}</div></Section>
      {!editing && <Section title="Credit investigation"><dl className={styles.fieldGrid}><Field label="Investigated by" value={sample ? "San Jose, Maria (CI)" : undefined} /><Field label="Amount applied" value={loan.amount.replace(/\.00$/, "")} /><Field label="CI recommended amount" value={sample?.recommended} /></dl><div className={styles.fileList}>{sample ? artifacts.map((title, index) => <div className={`${styles.fileRow} ${styles.artifactRow}`} key={title}><Image src="/branch-manager/text-input.svg" alt="" width={20} height={20} /><div><div className={styles.fileTitle}><strong>{title}</strong><span className={`${styles.badge} ${styles.active}`}>Completed</span></div><p>Completed {sample.completed[index]} · San Jose, Maria (CI)</p></div><button className={styles.button} aria-label={`View ${title.toLowerCase()}`} onClick={() => setNotice({ title, message: `Completed ${sample.completed[index]} by San Jose, Maria (CI). The full report is not attached to this demo submission.` })}>View</button></div>) : <p className={styles.unavailable}>No investigation reports available.</p>}</div></Section>}
      {!editing && !pending && <Section title="Decision"><dl className={styles.fieldGrid}><Field label="Decision" value={loan.status === "Rejected" ? "Rejected" : ["Active", "Approved"].includes(loan.status) ? "Approved" : undefined} /><Field label="Decided by" value={sample?.decisionDate ? "Jose Rizal (Branch Manager)" : undefined} /><Field label="Decision date" value={sample?.decisionDate} /></dl></Section>}
      {!editing && <Section title="Projected payment schedule"><PaymentSchedule firstDue={scheduleAvailable ? sample?.firstDue : undefined} /></Section>}
    </div>
    {editing && <><section className={styles.editSchedule}><h2>Projected Payment Schedule <span>{parseInt(displayLoan.term)} payments</span></h2><PaymentSchedule key={product} firstDue={scheduleAvailable ? sample?.firstDue : undefined} /></section><footer className={styles.editActions}><button className={styles.button} onClick={onBack}>Cancel</button><button className={`${styles.button} ${styles.approveButton}`} onClick={() => setAction("save")}>Save changes</button></footer></>}
    {!editing && pending && <footer className={styles.decisionActions}><button className={styles.button} onClick={() => setAction("reject")}>Reject</button><button className={styles.button} onClick={() => setAction("return")}>Return to CI</button><button className={`${styles.button} ${styles.approveButton}`} onClick={() => setAction("approve")}>Approve loan</button></footer>}
    {actionProps && <ActionDialog open={Boolean(action)} {...actionProps} onClose={() => setAction(null)} onConfirm={() => {
      if (action === "save") onSave?.(displayLoan);
      else {
        const completedAction = action;
        setAction(null);
        setNotice({ title: completedAction === "approve" ? "Loan approved" : completedAction === "reject" ? "Application rejected" : "Returned to CI", message: "This demo records the interaction locally; no live loan was changed." });
      }
    }} />}
    <dialog ref={dialog} className={styles.details} aria-labelledby="detail-notice-title" onClose={() => setNotice(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className={styles.detailHeader}><h2 id="detail-notice-title">{notice?.title}</h2><button className={styles.button} onClick={() => dialog.current?.close()}>Close</button></div><p>{notice?.message}</p></dialog>
  </main>;
}

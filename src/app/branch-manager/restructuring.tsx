"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ActionDialog from "./action-dialog";
import shared from "./branch-manager.module.css";
import styles from "./restructuring.module.css";

type Proposal = { amount: number; term: number; dailyAmount: number; effectiveDate: string };
type EligibleLoan = { id: string; name: string; amount: number; balance: number; term: number; proposal: Proposal };

// Shared Figma proposal for every demo detail screen, not a loan-pricing calculation.
const figmaProposal: Proposal = { amount: 80000, term: 90, dailyAmount: 1032.89, effectiveDate: "Sep 1, 2026" };
const eligibleLoans: EligibleLoan[] = [
  { id: "LN-0023", name: "Reyes, Juan", amount: 60000, balance: 39000, term: 60, proposal: figmaProposal },
  { id: "LN-0087", name: "Cruz, Maria", amount: 100000, balance: 58000, term: 90, proposal: figmaProposal },
  { id: "LN-0204", name: "Villanueva, Luz", amount: 100000, balance: 72000, term: 90, proposal: figmaProposal },
  { id: "LN-0266", name: "Soriano, Elena", amount: 100000, balance: 51000, term: 90, proposal: figmaProposal },
  { id: "LN-0411", name: "Aquino, Miguel", amount: 60000, balance: 33000, term: 60, proposal: figmaProposal },
];
const money = (value: number, decimals = 0) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
const percentage = (loan: EligibleLoan) => Math.round(loan.balance / loan.amount * 100);
const balanceLabel = (loan: EligibleLoan) => `${money(loan.balance)} (${percentage(loan)}%)`;

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return <Image src={`/branch-manager/${name}.svg`} alt="" width={size} height={size} />;
}

function LoanDetail({ loan, onBack, onConfirm }: { loan: EligibleLoan; onBack: () => void; onConfirm: (remarks: string) => void }) {
  const [remarks, setRemarks] = useState("The client requested restructuring due to delayed business income this quarter.");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const proposal = loan.proposal;
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0); }, []);

  return <main className={`${shared.main} ${styles.main}`}>
    <header className={styles.detailHeader}>
      <nav className={shared.breadcrumbs} aria-label="Breadcrumb"><button onClick={onBack}>Restructuring</button><Icon name="restructure-chevron" /><span aria-current="page">{loan.id}</span></nav>
      <div className={styles.title}><h1 ref={heading} tabIndex={-1}>{loan.name}</h1><span className={`${shared.badge} ${shared.active}`}><Icon name="imgDot" size={6} />Active</span></div>
    </header>
    <form onSubmit={event => { event.preventDefault(); if (remarks.trim()) setConfirmOpen(true); }} className={styles.detailForm}>
      <section className={styles.panel} aria-labelledby="original-contract">
        <h2 id="original-contract">Original contract</h2>
        <dl className={styles.twoColumns}><div><dt>Loan product</dt><dd>{money(loan.amount)} / {loan.term} days</dd></div><div><dt>Balance remaining</dt><dd>{balanceLabel(loan)}</dd></div></dl>
      </section>
      <section className={`${styles.panel} ${styles.comparison}`} aria-label="Contract comparison">
        <dl><div><dt>Original contract</dt><dd>{money(loan.amount)}</dd></div><div className={styles.newContract}><Icon name="restructure-arrow" size={20} /><div><dt>New restructured contract</dt><dd>{money(proposal.amount)}</dd></div></div></dl>
      </section>
      <section className={styles.panel} aria-labelledby="new-terms">
        <h2 id="new-terms">New terms</h2>
        <dl className={styles.threeColumns}><div><dt>New term</dt><dd>{`${proposal.term} days`}</dd></div><div><dt>New daily amount</dt><dd>{money(proposal.dailyAmount, 2)}</dd></div><div><dt>Effective date</dt><dd>{proposal.effectiveDate}</dd></div></dl>
      </section>
      <section className={styles.panel}>
        <h2><label htmlFor="restructure-remarks">Remarks (required)</label></h2>
        <textarea id="restructure-remarks" required value={remarks} onChange={event => setRemarks(event.target.value)} />
      </section>
      <div className={styles.actions}><button type="button" className={shared.button} onClick={onBack}>Cancel</button><button type="submit" className={`${shared.button} ${shared.approveButton}`} disabled={!remarks.trim()}>Restructure loan</button></div>
    </form>
    <ActionDialog
      open={confirmOpen}
      title="Restructure this loan?"
      description={`${loan.id} — ${loan.name} will be restructured to a new contract of ${money(proposal.amount)} (${Math.round(proposal.amount / loan.amount * 100)}% of the original ${money(loan.amount)}) over ${proposal.term} days, effective ${proposal.effectiveDate}. This replaces the existing contract and cannot be undone.`}
      mobileDescription={`${loan.id} — ${loan.name} will be restructured to ${money(proposal.amount)} (${Math.round(proposal.amount / loan.amount * 100)}% of the original ${money(loan.amount)}) over ${proposal.term} days, effective ${proposal.effectiveDate}. This replaces the existing contract and cannot be undone.`}
      confirmLabel="Restructure loan"
      choiceLabel="Reason (required)"
      choices={[
        { value: "reduced-income", label: "Client requested — reduced business income" },
        { value: "arrears", label: "Missed payments / arrears" },
        { value: "emergency", label: "Illness or family emergency" },
        { value: "other", label: "Other" },
      ]}
      defaultChoice="reduced-income"
      noteLabel="Additional detail (optional)"
      notePlaceholder="Add detail for the record"
      dangerHeading
      onClose={() => setConfirmOpen(false)}
      onConfirm={({ choice, note }) => onConfirm([remarks.trim(), choice, note].filter(Boolean).join(" — "))}
    />
  </main>;
}

export default function Restructuring() {
  const [selected, setSelected] = useState<EligibleLoan | null>(null);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const returnTo = useRef<string | null>(null);
  const results = eligibleLoans.filter(loan => !completed[loan.id] && (!term || loan.term === Number(term)) && `${loan.id} ${loan.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!selected && returnTo.current) {
      const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-restructure-loan="${returnTo.current}"]`);
      const visibleButton = Array.from(buttons).find(button => button.getClientRects().length);
      if (visibleButton) visibleButton.focus();
      else document.getElementById("eligible-heading")?.focus();
      returnTo.current = null;
    }
  }, [selected]);

  function openLoan(loan: EligibleLoan) { returnTo.current = loan.id; setSelected(loan); setNotice(""); }
  function restructureButton(loan: EligibleLoan) {
    return <button className={shared.button} data-restructure-loan={loan.id} aria-label={`Restructure ${loan.name}`} onClick={() => openLoan(loan)}><span className={styles.actionIcon}><Icon name="restructure-clock" /></span>Restructure</button>;
  }

  if (selected) return <LoanDetail key={selected.id} loan={selected} onBack={() => setSelected(null)} onConfirm={remarks => {
    setCompleted(current => ({ ...current, [selected.id]: remarks }));
    setNotice(`Restructuring for ${selected.name} saved for this demo session. No live loan was changed.`);
    setSelected(null);
  }} />;

  return <main className={`${shared.main} ${styles.main}`}>
    <header className={styles.listHeader}>
      <div><h1 id="eligible-heading" tabIndex={-1}>List of eligible submissions</h1><p>Loans where the remaining balance has reached 50% or more of the original contract.</p></div>
      <div className={styles.controls}>
        <div className={styles.select}><select aria-label="Filter by loan term" value={term} onChange={event => { setTerm(event.target.value); setPage(1); }}><option value="">Filter by</option><option value="60">60 days</option><option value="90">90 days</option></select><Icon name="imgChevronDown" /></div>
        <label className={`${shared.search} ${styles.search}`}><Icon name="imgSearchLg" /><input placeholder="Search by name or ID" aria-label="Search by name or ID" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      </div>
    </header>
    {notice && <p role="status" className={shared.saveNotice}>{notice}</p>}
    <div className={`${shared.tableContainer} ${styles.table}`}>
      <table aria-label="Eligible loans"><colgroup>{[10, 20.5, 13, 31, 9.5, 16].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup><thead><tr>{["Loan ID", "Client", "Loan amount", "Balance remaining", "Term", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.map(loan => <tr key={loan.id}><td>{loan.id}</td><td>{loan.name}</td><td>{money(loan.amount)}</td><td><div className={styles.balance}><span className={styles.track} aria-hidden="true"><span style={{ width: `${percentage(loan)}%` }} /></span><span>{balanceLabel(loan)}</span></div></td><td>{loan.term} Days</td><td>{restructureButton(loan)}</td></tr>)}</tbody>
      </table>
      {!rows.length && <p className={shared.empty}>No eligible submissions found.</p>}
      <div className={`${shared.pagination} ${styles.pagination}`}><span>Page {currentPage} of {pageCount}</span><select aria-label="Loans per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[5, 10, 20].map(size => <option key={size} value={size}>{size} per page</option>)}</select><div><button className={shared.button} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button className={shared.button} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
    </div>
    <div className={shared.cards}>{results.map(loan => <article className={shared.card} key={loan.id}><div className={shared.cardTop}><span>{loan.id}</span><span className={styles.term}>{loan.term} days</span></div><h2>{loan.name}</h2><dl><div><dt>Loan amount</dt><dd>{money(loan.amount)}</dd></div><div><dt>Balance remaining</dt><dd>{balanceLabel(loan)}</dd></div></dl>{restructureButton(loan)}</article>)}{!results.length && <p className={shared.empty}>No eligible submissions found.</p>}</div>
  </main>;
}

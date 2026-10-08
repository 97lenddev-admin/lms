"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import SignOutButton from "@/components/sign-out-button";
import type { UserProfileIdentity } from "@/lib/supabase/user-role";
import { MobileHeader } from "../credit-analyst/navigation";
import { submissions as demoSubmissions, type Submission, type SubmissionStatus } from "../credit-analyst/data";
import styles from "./branch-manager.module.css";
import AdvanceFilters, { emptyFilters, matchesFilters, type FilterValues } from "./advance-filters";
import SubmissionDetails from "./submission-details";

import Restructuring from "./restructuring";
import Reports from "./reports";
import PdfTemplates from "./pdf-templates";
import Penalties from "./penalties";

const statuses: SubmissionStatus[] = ["Active", "Approved", "Pending", "Rejected", "Inactive"];
// The branch-manager Figma sample uses a 60-day term for Garcia's loan.
const initialSubmissions = demoSubmissions.map(loan => loan.id === "LN-0142" ? { ...loan, term: "60 days" } : loan);
const navigation = [["Masterlist", "imgList"], ["Advance Filter", "imgFilterFunnel02"], ["Restructuring", "imgRepeat02"], ["Reports", "imgPieChart03"], ["PDF Templates", "imgFile06"], ["Penalties", "imgAlertTriangle"]];
const submittedBy = (loan: Submission) => ["LN-0204", "LN-0078"].includes(loan.id) ? "M. Dela Cruz (CA)" : "J. Santos (CA)";
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <Image src={`/branch-manager/${name}.svg`} alt="" width={size} height={size} />;
}
function Badge({ status }: { status: SubmissionStatus }) {
  return <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}><Icon name={["imgDot", "imgDot1", "imgDot2", "imgDot3", "imgDot4"][statuses.indexOf(status)]} size={6} />{status}</span>;
}
function Search({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <label className={styles.search}><Icon name="imgSearchLg" size={16} /><input aria-label={label} placeholder="Search" value={value} onChange={e => onChange(e.target.value)} /></label>;
}
export default function BranchManagerApp({ userProfile }: { userProfile: UserProfileIdentity }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [advance, setAdvance] = useState(false);

  const [restructuring, setRestructuring] = useState(false);
  const [reports, setReports] = useState(false);
  const [pdfTemplates, setPdfTemplates] = useState(false);
  const [penalties, setPenalties] = useState(false);
  const [editing, setEditing] = useState(false);
  const [applied, setApplied] = useState<FilterValues>(emptyFilters);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [navQuery, setNavQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobileCount, setMobileCount] = useState(10);
  const [sort, setSort] = useState<"asc" | "desc" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<Submission | null>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const filterRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (mobileOpen) menu.current?.showModal(); else menu.current?.close(); }, [mobileOpen]);
  const filtered = submissions.filter(loan => (advance ? matchesFilters(loan, submittedBy(loan), applied) : (!status || loan.status === status)) && `${loan.id} ${loan.name} ${submittedBy(loan)}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (sort) filtered.sort((a, b) => (Date.parse(a.submitted) - Date.parse(b.submitted)) * (sort === "asc" ? 1 : -1));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const loans = filtered.slice((page - 1) * pageSize, page * pageSize);
  function resetQuery(value: string) { setQuery(value); setPage(1); }
  function closeMenu() { setMobileOpen(false); }
  function navContent() {

    const active = penalties ? "Penalties" : pdfTemplates ? "PDF Templates" : reports ? "Reports" : restructuring ? "Restructuring" : advance ? "Advance Filter" : "Masterlist";
    return <><div className={styles.navHeader}><div className={styles.logo}><Icon name="imgLogomarkWrapper" size={27} /></div><Search value={navQuery} onChange={setNavQuery} label="Search navigation" /></div><nav aria-label="Branch manager navigation" className={styles.nav}>{navigation.filter(([name]) => name.toLowerCase().includes(navQuery.toLowerCase())).map(([name, icon]) => <button key={name} aria-current={name === active ? "page" : undefined} onClick={() => { closeMenu(); setSelected(null); setReports(name === "Reports"); setRestructuring(name === "Restructuring"); setPdfTemplates(name === "PDF Templates"); setPenalties(name === "Penalties"); setAdvance(name === "Advance Filter"); setEditing(false); resetQuery(""); setStatus(""); setPage(1); setSort(null); setMobileCount(10); }}><Icon name={icon} />{name}</button>)}</nav><div className={styles.account}><div className={styles.avatar}><Image src="/branch-manager/imgAvatar.png" alt={userProfile.fullName} width={40} height={40} /><span /></div><div><strong>{userProfile.fullName}</strong><p>{userProfile.role}</p></div><SignOutButton /></div></>;
  }
  function viewButton(loan: Submission) { if (advance) return <div className={styles.resultActions}><button className={styles.button} onClick={() => { setEditing(false); setSelected(loan); }}>View</button><button className={`${styles.button} ${styles.approveButton}`} onClick={() => { setEditing(true); setSelected(loan); }}>Edit</button></div>; return <button className={styles.button} onClick={() => { setEditing(false); setSelected(loan); }} aria-label={`View details for ${loan.name}`}><span className={styles.eye}><Icon name="imgEye" /></span>View details</button>; }
  return <div className={styles.shell}>
    <MobileHeader onOpen={() => setMobileOpen(true)} />
    <aside className={styles.sidebar}>{navContent()}</aside>
    <dialog ref={menu} className={styles.mobileMenu} onCancel={closeMenu} onClick={e => { if (e.target === e.currentTarget) closeMenu(); }}><div className={styles.menuContent}><button className={styles.button} onClick={closeMenu}>Close menu</button>{navContent()}</div></dialog>
    {penalties ? <Penalties /> : pdfTemplates ? <PdfTemplates /> : reports ? <Reports submissions={submissions} onCancel={() => setReports(false)} /> : restructuring ? <Restructuring /> : selected ? <SubmissionDetails key={selected.id} loan={selected} badge={<Badge status={selected.status} />} submittedBy={submittedBy(selected)} editing={editing} backLabel={advance ? "Advance Filter" : "masterlist"} products={submissions} onSave={updated => { setSubmissions(rows => rows.map(row => row.id === updated.id ? updated : row)); setSelected(null); setSaved(true); }} onBack={() => setSelected(null)} /> : <main className={styles.main}>
      {advance ? <><header className={styles.advanceHeader}><h1>Advance Filter <span className={styles.branchBadge}>Caloocan Branch</span></h1><p>Showing submissions for your assigned branch only.</p></header><AdvanceFilters initialValues={applied} products={submissions} onApply={values => { setApplied(values); setSort(values.sort === "oldest" ? "asc" : values.sort === "newest" ? "desc" : null); setPage(1); setMobileCount(10); }} />{saved && <p role="status" className={styles.saveNotice}>Changes saved for this session.</p>}<div className={styles.resultSummary}>Showing {Math.min(mobileCount, filtered.length)} of {filtered.length}<select aria-label="Sort results" value={sort ?? ""} onChange={e => { setSort(e.target.value as "asc" | "desc" || null); setPage(1); }}><option value="">Date submitted</option><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div></> : <header className={styles.header}><h1>Masterlist of Submissions</h1><div className={styles.filters}><Search value={query} onChange={resetQuery} label="Search submissions" /><div className={styles.selectWrap}><select ref={filterRef} aria-label="Filter by status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Status</option>{statuses.map(value => <option key={value}>{value}</option>)}</select><Icon name="imgChevronDown" size={16} /></div></div></header>}
      <div className={styles.tableContainer}><table><colgroup>{(advance ? [109, 155, 140, 167, 170, 130, 225] : [109, 196, 140, 167, 170, 130, 184]).map((width, i) => <col key={i} style={{ width: `${width / 10.96}%` }} />)}</colgroup><thead><tr>{["Loan ID", "Client", "Loan amount", "Submitted by", "Date submitted", "Status", "Action"].map(label => <th key={label} aria-sort={label === "Date submitted" ? sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none" : undefined}>{label === "Date submitted" ? <button onClick={() => { setSort(sort === "desc" ? "asc" : "desc"); setPage(1); }}>{label}<span style={{ transform: sort === "asc" ? "rotate(180deg)" : undefined }}><Icon name="imgArrowDown" size={12} /></span></button> : label}</th>)}</tr></thead><tbody>{loans.map(loan => <tr key={loan.id}><td>{loan.id}</td><td>{loan.name}</td><td>{loan.amount}</td><td>{submittedBy(loan)}</td><td>{loan.submitted}</td><td><Badge status={loan.status} /></td><td>{viewButton(loan)}</td></tr>)}</tbody></table>{!loans.length && <p className={styles.empty}>No submissions found. Try another search or status.</p>}<div className={styles.pagination}><span>Page {page} of {pageCount}</span><select aria-label="Submissions per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 30].map(value => <option key={value} value={value}>{value} per page</option>)}</select><div><button className={styles.button} disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className={styles.button} disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div></div>
      <div className={styles.cards}>{filtered.slice(0, mobileCount).map(loan => <article key={loan.id} className={styles.card}><div className={styles.cardTop}><span>{loan.id}</span><Badge status={loan.status} /></div><h2>{loan.name}</h2><dl><div><dt>Loan amount</dt><dd>{loan.amount}</dd></div><div><dt>Date submitted</dt><dd>{loan.submitted}</dd></div><div className={styles.submitter}><dt>Submitted by</dt><dd>{submittedBy(loan)}</dd></div></dl>{viewButton(loan)}</article>)}{filtered.length > mobileCount && <button className={styles.button} onClick={() => setMobileCount(current => current + 10)}>Load 10 more results</button>}{!filtered.length && <p className={styles.empty}>No submissions found. Try another search or status.</p>}</div>
    </main>}
  </div>;
}



"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import shared from "./branch-manager.module.css";
import styles from "./reports.module.css";
import { defaultReportFilters, filterReport, reportCsv, reportProduct, reportSummary, type ReportFilters, type ReportLoan } from "./report-data";

const statuses = ["Active", "Approved", "Pending", "Rejected", "Inactive"];
const dateLabel = (date: string) => date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Any date";
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return <Image src={`/branch-manager/${name}.svg`} alt="" width={size} height={size} />;
}

export default function Reports({ submissions, onCancel }: { submissions: ReportLoan[]; onCancel: () => void }) {
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  const [datesOpen, setDatesOpen] = useState(false);
  const [report, setReport] = useState<{ rows: ReportLoan[]; filters: ReportFilters; generated: string } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const changedView = useRef(false);
  const preview = filterReport(submissions, filters);
  const rows = report ? report.rows : preview.slice(0, 10);
  const activeFilters = report?.filters ?? filters;
  const range = `${dateLabel(activeFilters.from)} – ${dateLabel(activeFilters.to)}`;
  const summary = report ? reportSummary(report.rows) : null;
  const set = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => setFilters(current => ({ ...current, [key]: value }));

  useEffect(() => {
    if (changedView.current) { title.current?.focus(); window.scrollTo(0, 0); }
    changedView.current = true;
  }, [report]);

  function exportCsv() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([reportCsv(report.rows)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = "loan-performance-report.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const select = (label: string, key: "status" | "product", placeholder: string, options: string[]) => <label className={shared.filterField}>{label}<span className={shared.filterSelect}><select value={filters[key]} onChange={event => set(key, event.target.value)}><option value="">{placeholder}</option>{options.map(option => <option key={option}>{option}</option>)}</select><Icon name="imgChevronDown" /></span></label>;

  return <main className={`${shared.main} ${styles.main}`} data-report={report ? "generated" : "preview"}>
    <header className={styles.header}>
      <div><h1 ref={title} tabIndex={-1}>{report ? "Loan performance report" : "Advance filter for reports"}{!report && <span className={shared.branchBadge}>Caloocan Branch</span>}</h1>{report && <p className={styles.metadata}>Caloocan Branch · Generated {report.generated} by Jose Rizal (Branch Manager)</p>}</div>
      {report && <span className={styles.dateBadge}><Icon name="filter-calendar" />{range}</span>}
    </header>

    {!report && <form className={shared.filterPanel} onSubmit={event => { event.preventDefault(); setReport({ rows: preview.map(row => ({ ...row })), filters: { ...filters }, generated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }); }}>
      <div className={shared.filterBody}>
        <div className={shared.filterTop}>
          <label className={shared.filterField}>Report type<span className={shared.filterSelect}><select defaultValue="performance"><option value="performance">Loan performance</option></select><Icon name="imgChevronDown" /></span></label>
          <label className={shared.filterField}>Sort by<span className={shared.filterSelect}><select value={filters.sort} onChange={event => set("sort", event.target.value as ReportFilters["sort"])}><option value="newest">Date submitted</option><option value="oldest">Date submitted (oldest first)</option></select><Icon name="imgChevronDown" /></span></label>
          <div className={shared.filterField}>Date Range<button type="button" className={shared.button} aria-expanded={datesOpen} aria-controls="report-date-range" onClick={() => setDatesOpen(!datesOpen)}><Icon name="filter-calendar" size={20} />{range}</button></div>
        </div>
        {datesOpen && <div id="report-date-range" className={shared.filterPair}><label className={shared.filterField}>From<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => set("from", event.target.value)} /></label><label className={shared.filterField}>To<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => set("to", event.target.value)} /></label></div>}
        <div className={shared.filterPair}>{select("Status", "status", "All statuses", statuses)}{select("Loan product", "product", "Any product", [...new Set(submissions.map(reportProduct))])}</div>
      </div>
      <footer className={shared.filterFooter}><button type="button" className={shared.button} onClick={onCancel}>Cancel</button><button type="submit" className={`${shared.button} ${shared.approveButton}`}>Generate report</button></footer>
    </form>}

    {summary && <section className={styles.metrics} aria-label="Filtered report summary">
      {[
        { label: "Total submissions", value: summary.submissions, icon: "imgSend01", color: "green" },
        { label: "Total disbursed", value: summary.disbursed === null ? "N/A" : `₱${summary.disbursed.toLocaleString("en-PH", { notation: "compact", maximumFractionDigits: 1 })}`, icon: "imgReverseRight", color: "yellow", note: summary.disbursed === null ? "Disbursement data unavailable" : undefined },
        { label: "Approval rate", value: summary.approvalRate === null ? "N/A" : `${summary.approvalRate}%`, icon: "imgTrendUp01", color: "rose" },
        { label: "Restructured", value: summary.restructured ?? "N/A", icon: "imgRepeat04", color: "neutral", note: summary.restructured === null ? "Restructuring data unavailable" : undefined },
      ].map(metric => <article key={metric.label} className={styles.metric}><span className={`${styles.metricIcon} ${styles[metric.color]}`}><Icon name={`report-${metric.icon}`} size={24} /></span><p>{metric.label}{metric.label === "Approval rate" && <span className={styles.rateHint}> (approved ÷ decided)</span>}</p><strong>{metric.value}</strong>{metric.note && <small>{metric.note}</small>}</article>)}
    </section>}

    <section className={styles.tablePanel} aria-label={report ? "Generated report" : "Report preview"}>
      {!report && <div className={styles.previewHeader}><h2>Preview</h2><p role="status">Showing {rows.length} of {preview.length} matching records</p></div>}
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Loan report table; scroll horizontally for more columns">
        <table><colgroup><col style={{ width: 109 }} /><col /><col /><col style={{ width: 170 }} /><col style={{ width: 130 }} /></colgroup><thead><tr><th>Loan ID</th><th>Client</th><th>Loan amount</th><th aria-sort={activeFilters.sort === "newest" ? "descending" : "ascending"}><span>Date submitted <span className={activeFilters.sort === "oldest" ? styles.arrowUp : undefined}><Icon name="imgArrowDown" size={12} /></span></span></th><th>Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.name}</td><td>{row.amount}</td><td>{row.submitted}</td><td><span className={`${shared.badge} ${shared[row.status.toLowerCase()]}`}><Icon name={["imgDot", "imgDot1", "imgDot2", "imgDot3", "imgDot4"][statuses.indexOf(row.status)]} size={6} />{row.status}</span></td></tr>)}</tbody></table>
      </div>
      {!rows.length && <p className={shared.empty} role="status">No matching records. Try a different date range, status, or loan product.</p>}
      {!report && preview.length > rows.length && <p className={styles.previewFooter}>+ {preview.length - rows.length} more records included in the full report</p>}
    </section>

    {report && <footer className={styles.actions}><button className={shared.button} onClick={() => setReport(null)}><Icon name="report-imgArrowNarrowLeft" size={20} />Back</button><button className={`${shared.button} ${styles.csv}`} onClick={exportCsv}>Export CSV</button><button className={`${shared.button} ${shared.approveButton}`} onClick={() => window.print()}><Icon name="report-imgPrinter" size={20} />Print / PDF</button></footer>}
  </main>;
}

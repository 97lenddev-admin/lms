"use client";

import Image from "next/image";
import { useState } from "react";
import type { Submission } from "../credit-analyst/data";
import styles from "./branch-manager.module.css";

export type FilterValues = {
  status: string; sort: string; from: string; to: string; analyst: string; product: string;
  minimum: string; maximum: string; balanceMinimum: string; balanceMaximum: string;
  overdue: string; coMaker: boolean; flagged: boolean;
};
export const emptyFilters: FilterValues = {
  status: "", sort: "", from: "", to: "", analyst: "", product: "", minimum: "", maximum: "",
  balanceMinimum: "", balanceMaximum: "", overdue: "", coMaker: false, flagged: false,
};
export const productKey = (loan: Submission) => `${loan.amount.replace(/\.00$/, "")} / ${loan.term}`;
// Optional servicing fields must come from loan data; missing values are not treated as zero.
type FilterableSubmission = Submission & { balanceRemainingPercent?: number; daysOverdue?: number; hasFlaggedRemarks?: boolean };
export function matchesFilters(loan: FilterableSubmission, analyst: string, filters: FilterValues) {
  const amount = Number(loan.amount.replace(/[^\d.]/g, ""));
  const date = Date.parse(`${loan.submitted} UTC`);
  const overdueRanges: Record<string, [number, number]> = { "Current": [0, 0], "1–30 days": [1, 30], "31–60 days": [31, 60], "61–90 days": [61, 90], "90+ days": [91, Infinity] };
  const overdue = overdueRanges[filters.overdue];
  return (!filters.status || loan.status === filters.status)
    && (!filters.analyst || analyst === filters.analyst)
    && (!filters.product || productKey(loan) === filters.product)
    && (!filters.from || date >= Date.parse(filters.from))
    && (!filters.to || date <= Date.parse(filters.to) + 86399999)
    && (!filters.minimum || amount >= Number(filters.minimum))
    && (!filters.maximum || amount <= Number(filters.maximum))
    && (!filters.balanceMinimum || (loan.balanceRemainingPercent !== undefined && loan.balanceRemainingPercent >= Number(filters.balanceMinimum)))
    && (!filters.balanceMaximum || (loan.balanceRemainingPercent !== undefined && loan.balanceRemainingPercent <= Number(filters.balanceMaximum)))
    && (!overdue || (loan.daysOverdue !== undefined && loan.daysOverdue >= overdue[0] && loan.daysOverdue <= overdue[1]))
    && (!filters.coMaker || loan.hasCoMaker === true)
    && (!filters.flagged || loan.hasFlaggedRemarks === true);
}

function FilterIcon({ name, size = 16 }: { name: string; size?: number }) {
  return <Image className={styles.filterIcon} src={`/branch-manager/${name}.svg`} alt="" width={size} height={size} />;
}

export default function AdvanceFilters({ products, onApply, initialValues }: { initialValues: FilterValues; products: Submission[]; onApply: (values: FilterValues) => void }) {
  const [draft, setDraft] = useState(initialValues);
  const [more, setMore] = useState(false);
  const [dates, setDates] = useState(false);
  const set = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => setDraft(current => ({ ...current, [key]: value }));
  const select = (label: string, key: "status" | "analyst" | "product" | "overdue", placeholder: string, options: string[]) => (
    <label className={styles.filterField}>{label}<span className={styles.filterSelect}><select value={draft[key]} onChange={e => set(key, e.target.value)}><option value="">{placeholder}</option>{options.map(value => <option key={value}>{value}</option>)}</select><FilterIcon name="imgChevronDown" /></span></label>
  );
  const range = (label: string, minKey: "minimum" | "balanceMinimum", maxKey: "maximum" | "balanceMaximum", percent = false) => (
    <fieldset className={styles.filterRange}><legend>{label}</legend><div className={styles.rangeInputs}>
      <input aria-label={`${label} minimum`} type="number" min="0" max={draft[maxKey] || (percent ? 100 : undefined)} step="any" placeholder={percent ? "Min %" : "Min"} value={draft[minKey]} onChange={e => set(minKey, e.target.value)} />
      <input aria-label={`${label} maximum`} type="number" min={draft[minKey] || "0"} max={percent ? 100 : undefined} step="any" placeholder={percent ? "Max %" : "Max"} value={draft[maxKey]} onChange={e => set(maxKey, e.target.value)} />
    </div></fieldset>
  );
  return <form className={styles.filterPanel} onSubmit={e => { e.preventDefault(); onApply(draft); }}>
    <div className={styles.filterBody}>
      <div className={styles.filterTop}>
        {select("Status", "status", "Filter by status", ["Active", "Approved", "Pending", "Rejected", "Inactive"])}
        <label className={styles.filterField}>Sort by<span className={styles.filterSelect}><select value={draft.sort} onChange={e => set("sort", e.target.value)}><option value="">Date submitted</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select><FilterIcon name="imgChevronDown" /></span></label>
        <div className={styles.filterField}>Date Range<button type="button" className={styles.button} aria-expanded={dates} aria-controls="filter-dates" onClick={() => setDates(!dates)}><FilterIcon name="filter-calendar" size={20} />{draft.from || draft.to ? `${draft.from || "Any date"} – ${draft.to || "Any date"}` : "Select date range"}</button></div>
      </div>
      {dates && <div id="filter-dates" className={styles.filterPair}><label className={styles.filterField}>From<input type="date" value={draft.from} max={draft.to || undefined} onChange={e => set("from", e.target.value)} /></label><label className={styles.filterField}>To<input type="date" min={draft.from || undefined} value={draft.to} onChange={e => set("to", e.target.value)} /></label></div>}
      <div className={styles.filterPair}>{select("Submitted by", "analyst", "Any credit analyst", ["J. Santos (CA)", "M. Dela Cruz (CA)"])}{select("Loan product", "product", "Any product", [...new Set(products.map(productKey))])}</div>
      <button type="button" className={styles.moreFilters} aria-expanded={more} aria-controls="additional-criteria" onClick={() => setMore(!more)}><FilterIcon name="filter-chevron" />More filters</button>
      {more && <section id="additional-criteria" className={styles.additionalCriteria} aria-labelledby="additional-criteria-title">
        <h2 id="additional-criteria-title">Additional criteria</h2>
        <div className={styles.filterPair}>{range("Loan amount range (PHP)", "minimum", "maximum")}{range("Balance remaining (%)", "balanceMinimum", "balanceMaximum", true)}</div>
        <div className={styles.filterPair}>
          {select("Days overdue", "overdue", "Any", ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days"])}
          <div className={styles.filterChecks}><label><input type="checkbox" checked={draft.coMaker} onChange={e => set("coMaker", e.target.checked)} />Co-maker present</label><label><input type="checkbox" checked={draft.flagged} onChange={e => set("flagged", e.target.checked)} />Has flagged remarks</label></div>
        </div>
      </section>}
    </div>
    <footer className={styles.filterFooter}><button type="button" className={styles.button} onClick={() => { setDraft(emptyFilters); onApply(emptyFilters); }}>Cancel</button><button className={`${styles.button} ${styles.approveButton}`} type="submit">Apply filters</button></footer>
  </form>;
}


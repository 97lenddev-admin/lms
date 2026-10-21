"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import type { UserProfileIdentity } from "@/lib/supabase/user-role";
import { applicationSections, coMakerSections, FormSection, Submission, SubmissionStatus } from "./data";
import { DesktopNavigation, MobileHeader, MobileNavigation } from "./navigation";
import { createLoanApplication, createLoanCoMaker, getLoanCoMaker, getLoanCoMakers, type ApplicationFormData } from "./actions";

type Screen =
  | { type: "dashboard" }
  | { type: "application" }
  | { type: "section"; sectionId: string }
  | { type: "child" }
  | { type: "business"; businessIndex?: number }
  | { type: "co-business-entry"; businessIndex?: number; loan: Submission }
  | { type: "review" }
  | { type: "co-maker"; loan: Submission }
  | { type: "co-maker-view"; loan: Submission; returnTo: "dashboard" | "submission" }
  | { type: "co-section"; sectionId: string; loan: Submission }
  | { type: "co-child"; loan: Submission }
  | { type: "submission"; loan: Submission };

type FormDataState = ApplicationFormData;
type DocumentMetadata = { name: string; size: string; progress: number };

type ApplicationDraft = {
  version: 1;
  formData: FormDataState;
  completedSectionIds: string[];
  startedSectionIds: string[];
  childData: Record<string, string>;
  childAdded: boolean;
  businesses: Record<string, string>[];
  desktopChildren: Record<string, string>[];
  desktopBusinesses: Record<string, string>[];
  desktopDocuments?: DocumentMetadata[];
  customFields: number[];
  updatedAt: string;
};

type DesktopDraftData = Pick<ApplicationDraft, "formData" | "desktopChildren" | "desktopBusinesses" | "desktopDocuments" | "customFields">;

const applicationDraftKey = "lms.credit-analyst.application-draft.v1";

const primaryButton = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]";
const secondaryButton = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#fafafa]";
const inputClass = "h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-base font-normal text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10";

const numericValue = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
const peso = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value).replace("PHP", "₱").trim();

function draftName(draft: ApplicationDraft) {
  const personal = draft.formData.personal ?? {};
  const firstName = personal["First name"]?.trim();
  const lastName = personal["Last name"]?.trim();
  return [lastName, firstName].filter(Boolean).join(", ") || "New application";
}

function draftSectionCount(draft: ApplicationDraft) {
  const started = new Set(draft.startedSectionIds);
  Object.entries(draft.formData).forEach(([sectionId, values]) => {
    if (Object.values(values).some(value => value.trim())) started.add(sectionId);
  });
  const loan = draft.formData.loan ?? {};
  if (loan["Loan amount"]?.trim() && loan.Term?.trim()) started.add("schedule");
  return applicationSections.filter(section => started.has(section.id)).length;
}

function encodedRows(rows: Record<string, string>[]) {
  return Object.fromEntries(rows.map((row, index) => [String(index), JSON.stringify(row)]));
}

function decodedRows(section?: Record<string, string>) {
  return Object.keys(section ?? {}).sort((left, right) => Number(left) - Number(right)).flatMap(key => {
    try {
      const row = JSON.parse(section?.[key] ?? "");
      return row && typeof row === "object" && !Array.isArray(row) ? [row as Record<string, string>] : [];
    } catch {
      return [];
    }
  });
}

function decodedDocuments(value?: string): DocumentMetadata[] {
  try {
    const files = JSON.parse(value ?? "[]");
    return Array.isArray(files) ? files.filter(file => file && typeof file.name === "string" && typeof file.size === "string").map(file => ({ name: file.name, size: file.size, progress: 100 })) : [];
  } catch {
    return [];
  }
}

function draftUpdatedLabel(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "recently";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = sameDay ? "today" : date.toDateString() === yesterday.toDateString() ? "yesterday" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${day}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
function generatePaymentSchedule(amountValue: string, termValue: string) {
  const amount = numericValue(amountValue);
  const term = Math.max(0, Math.floor(numericValue(termValue)));
  if (!amount || !term) return [];
  const perPayment = amount / term;
  const firstDueDate = new Date(2026, 5, 24);
  return Array.from({ length: term }, (_, index) => {
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(firstDueDate.getDate() + index);
    return { number: String(index + 1).padStart(3, "0"), date: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), amount: peso(perPayment) };
  });
}

function calculateAge(dateOfBirth: string) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  if (!year || !month || !day) return "";
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? String(age) : "";
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const style = {
    Active: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]",
    Approved: "border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1]",
    Pending: "border-[#fde047] bg-[#fefce8] text-[#a16207]",
    Rejected: "border-[#fca5a5] bg-[#fef2f2] text-[#dc2626]",
    Inactive: "border-[#d4d4d4] bg-[#fafafa] text-[#525252]",
  }[status];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${style}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

function PageShell({ children, title, desktopTitle, supportingText, back, action, showActionOnDesktop = false }: { children: ReactNode; title: string; desktopTitle?: string; supportingText?: string; back?: () => void; action?: ReactNode; showActionOnDesktop?: boolean }) {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-white">
      <div className={`sticky top-14 z-20 h-14 border-b border-[#e5e5e5] bg-white px-4 lg:top-0 lg:px-8 ${desktopTitle ? "lg:static lg:h-[120px] lg:border-0 lg:pt-8" : ""}`}>
        <div className={`flex h-full w-full items-center gap-2 ${desktopTitle ? "lg:mx-auto lg:h-auto lg:max-w-[1096px] lg:items-start" : ""}`}>
          {back && <button onClick={back} className={desktopTitle ? "lg:hidden" : ""} aria-label="Go back"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} /></button>}
          <div className={desktopTitle ? "lg:flex lg:flex-col lg:gap-0.5" : ""}><h1 className="text-sm font-semibold text-[#525252] lg:text-lg"><span className={desktopTitle ? "lg:hidden" : ""}>{title}</span>{desktopTitle && <span className="hidden text-xl leading-[30px] text-[#171717] lg:block">{desktopTitle}</span>}</h1>{supportingText && <p className="hidden text-base leading-6 text-[#525252] lg:block">{supportingText}</p>}</div>
          <div className={`ml-auto ${desktopTitle && !showActionOnDesktop ? "lg:hidden" : ""}`}>{action}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Dashboard({ submissions, loadError, coMakerLoadingLoanId, draft, onNew, onResumeDraft, onDiscardDraft, onView, onCoMaker }: { submissions: Submission[]; loadError?: string; coMakerLoadingLoanId?: string; draft: ApplicationDraft | null; onNew: () => void; onResumeDraft: () => void; onDiscardDraft: () => void; onView: (loan: Submission) => void; onCoMaker: (loan: Submission) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | SubmissionStatus>("All");
  const [page, setPage] = useState(1);
  const [dateSort, setDateSort] = useState<"asc" | "desc" | null>(null);
  const pageSize = 10;
  const filtered = useMemo(() => submissions.filter(item => (filter === "All" || item.status === filter) && `${item.id} ${item.name}`.toLowerCase().includes(query.toLowerCase())), [filter, query, submissions]);
  const sorted = useMemo(() => dateSort ? [...filtered].sort((a, b) => {
    const difference = new Date(a.submitted).getTime() - new Date(b.submitted).getTime();
    return dateSort === "asc" ? difference : -difference;
  }) : filtered, [dateSort, filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  return (
    <main className="min-h-screen bg-white px-4 pb-12 pt-8 xl:px-6">
      <div className="mx-auto max-w-[1240px]">
        <div className="lg:hidden">
          <h1 className="text-xl font-semibold leading-[30px] text-[#171717]">My Submissions</h1>
          <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <Image src="/credit-analyst/icons/search.svg" alt="" width={16} height={16} />
            <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#737373]" placeholder="Search name or loan ID" />
          </label>
          <div className="mt-3 flex gap-0.5 overflow-x-auto">
            {["All", "Active", "Approved", "Rejected"].map(value => <button key={value} onClick={() => { setFilter(value as typeof filter); setPage(1); }} className={`h-9 shrink-0 rounded-lg px-3 text-sm font-semibold ${filter === value ? "border border-[#e11d48] bg-[#ffe4e6] text-[#be123c] shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "text-[#737373]"}`}>{value}</button>)}
          </div>
          <button onClick={onNew} className={`${primaryButton} mt-3 w-full gap-1`}><Image src="/credit-analyst/icons/plus-white.svg" alt="" width={20} height={20} />New Application</button>
        </div>
        <div className="overflow-x-auto pb-1">
        <div className="hidden lg:grid lg:min-w-[1072px] lg:grid-cols-[1fr_280px_93px_165px] lg:items-center lg:gap-3">
          <h1 className="whitespace-nowrap text-xl font-semibold leading-[30px] text-[#171717]">My Submissions</h1>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <Image src="/credit-analyst/icons/search.svg" alt="" width={16} height={16} />
            <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search" />
          </label>
          <select value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setPage(1); }} className="hidden h-10 min-w-0 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10 lg:block">
            {["All", "Active", "Approved", "Pending", "Rejected", "Inactive"].map(value => <option key={value}>{value}</option>)}
          </select>
          <button onClick={onNew} className={`${primaryButton} hidden gap-1 lg:inline-flex lg:w-[165px]`}><Image src="/credit-analyst/icons/plus-white.svg" alt="" width={20} height={20} />New Application</button>
        </div>
        </div>

        {draft && <section className="mt-6 flex flex-col gap-4 rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[#171717]">Unfinished application — {draftName(draft)}</h2>
            <p className="mt-1 text-sm text-[#525252]">On this device · last edited {draftUpdatedLabel(draft.updatedAt)} · {draftSectionCount(draft)} of {applicationSections.length} sections</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onDiscardDraft} className={`${secondaryButton} flex-1 sm:flex-none`}>Discard</button>
            <button type="button" onClick={onResumeDraft} className={`${primaryButton} flex-1 sm:flex-none`}>Resume</button>
          </div>
        </section>}

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#737373] lg:hidden">Submitted · {filtered.length}</p>

        {loadError && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
        {!loadError && submissions.length === 0 && <p className="mt-6 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-8 text-center text-sm text-[#525252]">No loan applications yet. Create the first application to get started.</p>}

        {submissions.length > 0 && <div className="mt-6 hidden overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:block">
          <table className="w-full min-w-[1072px] table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[112px]"/><col className="w-[190px]"/><col className="w-[126px]"/><col className="w-[100px]"/><col className="w-[154px]"/><col className="w-[120px]"/><col className="w-[270px]"/></colgroup>
            <thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Loan ID", "Name", "Amount", "Term", "Date submitted", "Status", "Action"].map(h => <th className="px-6 py-3 font-semibold" key={h}>{h === "Date submitted" ? <button type="button" onClick={() => { setDateSort(current => current === "desc" ? "asc" : "desc"); setPage(1); }} className="inline-flex items-center gap-1 whitespace-nowrap text-left uppercase" aria-label={`Sort by date submitted${dateSort ? ` ${dateSort === "asc" ? "ascending" : "descending"}` : ""}`}>Date submitted <Image className={dateSort === "asc" ? "rotate-180" : ""} src="/credit-analyst/icons/arrow-down.svg" alt="" width={12} height={12} /></button> : h}</th>)}</tr></thead>
            <tbody>{paginated.map(loan => <tr key={loan.id} className="h-[72px] border-t border-[#e5e5e5] text-[#404040]"><td className="whitespace-nowrap px-6">{loan.id}</td><td className="whitespace-nowrap px-6">{loan.name}</td><td className="whitespace-nowrap px-6">{loan.amount}</td><td className="whitespace-nowrap px-6">{loan.term}</td><td className="whitespace-nowrap px-6">{loan.submitted}</td><td className="whitespace-nowrap px-6"><StatusBadge status={loan.status} /></td><td className="px-6"><div className="flex flex-nowrap gap-3"><button onClick={() => onView(loan)} className={`${secondaryButton} h-9 gap-2 px-3`}><Image src="/credit-analyst/icons/eye.svg" alt="" width={20} height={20} />View</button><button disabled={coMakerLoadingLoanId === loan.id} onClick={() => onCoMaker(loan)} className={`${secondaryButton} h-9 gap-2 px-3 disabled:cursor-wait disabled:opacity-60`}><Image src={loan.coMaker ? "/credit-analyst/icons/eye.svg" : "/credit-analyst/icons/user-plus.svg"} alt="" width={20} height={20} />{coMakerLoadingLoanId === loan.id ? "Loading…" : loan.coMaker ? "Co-maker" : "Add"}</button></div></td></tr>)}</tbody>
          </table>
          <div className="flex h-16 min-w-[1072px] items-center border-t border-[#e5e5e5] px-6 text-sm text-[#404040]"><span>Page {page} of {pageCount}</span><select className="ml-3 h-9 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm"><option>10 per page</option></select><button disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))} className={`${secondaryButton} ml-auto h-9 disabled:cursor-not-allowed disabled:opacity-50`}>Previous</button><button disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))} className={`${secondaryButton} ml-3 h-9 disabled:cursor-not-allowed disabled:opacity-50`}>Next</button></div>
        </div>}

        <div className="mt-3 flex flex-col gap-3 lg:hidden">
          {filtered.map(loan => <article key={loan.id} className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"><div className="p-3"><div className="flex items-start"><div className="min-w-0 flex-1"><h2 className="font-medium text-[#525252]">{loan.name}</h2><p className="mt-1 text-xs text-[#737373]">{loan.id} · {loan.amount}</p><p className="mt-1 text-xs text-[#737373]">Submitted {loan.submitted}</p></div><StatusBadge status={loan.status} /></div></div><div className="flex gap-4 border-t border-[#e5e5e5] px-4 py-3 text-sm font-semibold text-[#be123c]"><button onClick={() => onView(loan)}>View</button><button disabled={coMakerLoadingLoanId === loan.id} onClick={() => onCoMaker(loan)} className="disabled:cursor-wait disabled:opacity-60">{coMakerLoadingLoanId === loan.id ? "Loading…" : loan.coMaker ? "Co-maker" : "Add"}</button></div></article>)}
        </div>
      </div>
    </main>
  );
}

function Checklist({ sections, sectionData = {}, completedIds, startedIds, onSection, onReview, onSaveDraft, coMaker, error, pending = false }: { sections: FormSection[]; sectionData?: FormDataState; completedIds: Set<string>; startedIds: Set<string>; onSection: (id: string) => void; onReview: () => void; onSaveDraft?: () => void; coMaker?: boolean; error?: string; pending?: boolean }) {
  const completedCount = sections.filter(section => completedIds.has(section.id)).length;
  const progress = completedCount / sections.length;
  return (
    <div className={`mx-auto flex max-w-3xl flex-col px-4 pb-24 lg:px-8 ${coMaker ? "pt-8" : "pt-2"}`}>
      {coMaker && <div className="mb-6 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4"><p className="text-xs font-semibold uppercase text-[#525252]">Loan reference</p><p className="mt-1 text-lg font-medium">LN-0023 · Reyes, Juan</p><p className="mt-1 text-sm text-[#737373]">₱60,000.00 applied · ₱60,000.00 approved</p><p className="mt-1 text-sm text-[#737373]">Released Mar 5, 2026</p></div>}
      <div className="mb-6"><div className="flex text-sm text-[#525252]"><span>{completedCount} of {sections.length} sections complete</span><span className="ml-auto">{Math.round(progress * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5e5e5]"><div className="h-full rounded-full bg-[#e11d48]" style={{ width: `${progress * 100}%` }} /></div></div>
      <div className="flex flex-col gap-3">{sections.map((section, index) => { const complete = completedIds.has(section.id); const inProgress = !complete && startedIds.has(section.id); const enteredValues = Object.values(sectionData[section.id] ?? {}).filter(Boolean); const summary = enteredValues.slice(0, 2).join(" · "); return <button key={section.id} onClick={() => onSection(section.id)} className={`flex min-h-[70px] items-center rounded-xl border bg-white p-4 text-left ${inProgress ? "border-[#f59e0b]" : "border-[#e5e5e5]"}`}><span className={`mr-4 flex size-9 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#dcfce7] text-[#16a34a]" : inProgress ? "bg-[#fef9c3] text-[#ca8a04]" : "bg-[#f5f5f5] text-[#737373]"}`}>{complete ? "✓" : index + 1}</span><span className="min-w-0 flex-1"><span className="block font-medium text-[#525252]">{section.title}</span>{summary && <span className="mt-0.5 block truncate text-sm text-[#737373]">{summary}</span>}</span>{inProgress && <span className="mr-3 rounded-full border border-[#fde047] bg-[#fefce8] px-2 py-1 text-xs text-[#a16207]">In progress</span>}<span className="text-xl text-[#a3a3a3]">›</span></button>; })}</div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e5e5e5] bg-white lg:left-[280px]"><div className="mx-auto flex max-w-3xl gap-3 px-4 py-4 lg:px-8">{onSaveDraft && <button type="button" onClick={onSaveDraft} className={`${secondaryButton} flex-1`}>Save draft</button>}<button disabled={pending} onClick={onReview} className={`${primaryButton} flex-1 ${progress < 1 ? "opacity-50" : ""} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? "Saving…" : coMaker ? "Save co-maker" : "Review & submit"}</button></div></div>
    </div>
  );
}

const fieldPlaceholders: Record<string, string> = {
  "Last name": "Dela Cruz",
  "First name": "Ana",
  "Middle name": "Reyes",
  "Date of birth": "MM/DD/YYYY",
  Age: "Auto-calculated",
  "Civil status": "Select status",
  Citizenship: "Select citizenship",
  Gender: "Select gender",
  "Place of birth": "City, Province",
  "Permanent address": "Search address",
  Barangay: "Search address...",
  "City/Town": "City/Town",
  "ZIP code": "xxxx",
  Region: "Select region",
  "Contact number": "09XX XXX XXXX",
  "Email / Facebook address": "email@email.com",
  "Number of children": "2",
  "Business name": "Business name",
  Type: "Select business type",
  Address: "Search address...",
  Years: "Years employed",
  "Gross monthly income": "PHP 0.00",
  "Spouse name": "Full name",
  Occupation: "Occupation",
  Company: "Employer name",
  "Monthly income/salary": "PHP 0.00",
  "Real and personal properties owned": "List properties owned, if any",
  Name: "Full name",
  "Loan product": "Select loan product",
  "Loan amount": "PHP 60,000",
  Term: "60 Days",
};

const selectOptions: Record<string, string[]> = {
  "Civil status": ["Single", "Married", "Widowed", "Separated"],
  Citizenship: ["Filipino", "Dual citizen", "Foreign national"],
  Gender: ["Male", "Female", "Prefer not to say"],
  Region: ["NCR", "CAR", "Region I", "Region II", "Region III", "Region IV-A", "MIMAROPA", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII", "BARMM"],
  Type: ["Retail", "Wholesale", "Services", "Manufacturing", "Agriculture", "Other"],
  "Loan product": ["Daily", "Weekly", "Semi-monthly", "Monthly"],
};

function FormField({ label, textarea, value, readOnly = false, onValueChange }: { label: string; textarea?: boolean; value?: string; readOnly?: boolean; onValueChange?: (value: string) => void }) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const currentValue = value ?? internalValue;
  const updateValue = (nextValue: string) => { setInternalValue(nextValue); onValueChange?.(nextValue); };
  const normalizedLabel = label.toLowerCase();
  const isSelect = label !== "Relationship to borrower" && ["status", "gender", "product", "type", "relationship", "frequency", "religion", "civil", "citizenship", "region"].some(option => normalizedLabel.includes(option));
  const placeholder = isSelect ? fieldPlaceholders[label] ?? `Select ${label.toLowerCase()}` : fieldPlaceholders[label] ?? (label.toLowerCase().includes("amount") || label.toLowerCase().includes("income") ? "PHP 0.00" : `Enter ${label.toLowerCase()}`);
  const options = selectOptions[label] ?? (normalizedLabel.includes("region") ? selectOptions.Region : []);
  const isBirthDate = normalizedLabel === "date of birth" || normalizedLabel === "birthday";
  const isDateField = isBirthDate || normalizedLabel.endsWith("release date");
  return <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.01em] text-[#525252]">{label}{label === "Email / Facebook address" ? <span className="flex h-10 overflow-hidden rounded-lg border border-[#d4d4d4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[#e11d48]"><span className="flex items-center border-r border-[#d4d4d4] px-3 text-base font-normal normal-case text-[#525252]">URL</span><input required value={currentValue} onChange={event => updateValue(event.target.value)} className="min-w-0 flex-1 px-3 text-base font-normal normal-case text-[#171717] outline-none placeholder:text-[#a3a3a3]" placeholder={placeholder} /></span> : textarea ? <textarea required value={currentValue} onChange={event => updateValue(event.target.value)} className={`${inputClass} h-[124px] resize-none py-3`} placeholder={placeholder} /> : isDateField ? <input required type="date" max={isBirthDate ? new Date().toISOString().slice(0, 10) : undefined} value={currentValue} onChange={event => updateValue(event.target.value)} className={`${inputClass} min-w-0 text-base font-normal normal-case text-[#525252]`} /> : isSelect ? <select required value={currentValue} onChange={event => updateValue(event.target.value)} className={`${inputClass} text-base font-normal normal-case ${currentValue ? "text-[#171717]" : "text-[#a3a3a3]"}`}><option value="" disabled>{placeholder}</option>{options.map(option => <option key={option} value={option} className="text-[#171717]">{option}</option>)}</select> : <input required={!readOnly} readOnly={readOnly} value={currentValue} onChange={event => updateValue(event.target.value)} className={`${inputClass} text-base font-normal normal-case ${readOnly ? "bg-[#fafafa] text-[#525252]" : ""}`} placeholder={readOnly ? "" : placeholder} />}</label>;
}

function MobileSectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">{children}</h2>;
}

function MobileApplicationFields({ section, values, childAdded, childData, businesses, onFieldChange, onChild, onBusiness, onAddField }: { section: FormSection; values: Record<string, string>; childAdded: boolean; childData: Record<string, string>; businesses: Record<string, string>[]; onFieldChange: (field: string, value: string) => void; onChild: () => void; onBusiness: (index?: number) => void; onAddField: () => void }) {
  const field = (label: string, extra = "") => <div className={extra}><FormField label={label} textarea={label.toLowerCase().includes("properties") || label.toLowerCase().includes("remarks")} value={values[label] ?? ""} readOnly={label === "Age" && ["personal", "co-personal"].includes(section.id)} onValueChange={value => { onFieldChange(label, value); if (label === "Date of birth") onFieldChange("Age", calculateAge(value)); }} /></div>;
  if (section.id === "documents") return <Documents mobileUploadOnly initialFiles={decodedDocuments(values.__files)} onFilesChange={files => onFieldChange("__files", JSON.stringify(files.map(({ name, size }) => ({ name, size }))))} onAddField={onAddField} />;
  if (section.id === "personal") return <div className="flex flex-col gap-6">
    <section><MobileSectionHeading>Name</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Last name", "col-span-2")}{field("First name")}{field("Middle name")}</div></section>
    <section><MobileSectionHeading>Identity</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Date of birth")}{field("Age")}{field("Civil status")}{field("Gender")}{field("Citizenship", "col-span-2")}{field("Place of birth", "col-span-2")}</div></section>
    <section><MobileSectionHeading>Permanent address</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Permanent address", "col-span-2")}{field("Barangay")}{field("City/Town")}{field("ZIP code")}{field("Region")}</div></section>
    <section><MobileSectionHeading>Present address</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-3 text-sm">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option}><input required checked={(values["Present address"] || "Rented") === option} onChange={() => onFieldChange("Present address", option)} type="radio" name="mobile-residence" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></section>
    <section><MobileSectionHeading>Contact</MobileSectionHeading><div className="mt-3 grid gap-4">{field("Contact number")}{field("Email / Facebook address")}</div></section>
    <section><MobileSectionHeading>Children</MobileSectionHeading><div className="mt-3">{field("Number of children")}<p className="mt-1 text-xs text-[#737373]">2 rows generated from the count above.</p><div className="mt-3 flex flex-col gap-2">{childAdded && <button type="button" onClick={onChild} className="flex items-center rounded-xl border border-[#e5e5e5] p-3 text-left"><span className="min-w-0 flex-1"><span className="block text-sm">{childData.Name}</span><span className="block truncate text-xs text-[#737373]">{[childData["Grade/Course"], childData.School, childData.Age].filter(Boolean).join(" · ")}</span></span><span>›</span></button>}<button type="button" onClick={onChild} className="rounded-lg border border-dashed border-[#d4d4d4] py-3 text-sm font-medium text-[#737373]">＋ {childAdded ? "Add another child" : "Add child"}</button></div></div></section>
  </div>;
  if (section.id === "business") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Business</MobileSectionHeading><div className="flex flex-col gap-3">{businesses.map((business, index) => <button key={`${business["Business name"]}-${index}`} type="button" onClick={() => onBusiness(index)} className="first:mt-3 flex w-full items-center rounded-xl border border-[#e5e5e5] p-4 text-left"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#525252]">{business["Business name"]}</span><span className="text-xs text-[#737373]">{[business.Type, business.Address, business.Years && `${business.Years} yrs`].filter(Boolean).join(" · ")}</span></span><span className="text-xl text-[#a3a3a3]">›</span></button>)}</div><button type="button" onClick={() => onBusiness()} className="mt-3 w-full rounded-lg border border-dashed border-[#e5e5e5] py-3 text-sm font-semibold text-[#737373]">＋ {businesses.length ? "Add another business" : "Add business"}</button></section><section><MobileSectionHeading>Income</MobileSectionHeading><div className="mt-3">{field("Gross monthly income")}<p className="mt-2 text-sm text-[#525252]">Combined across all businesses listed above.</p></div></section></div>;
  if (section.id === "household") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Spouse</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Spouse name", "col-span-2")}{field("Occupation")}{field("Age")}</div></section><section><MobileSectionHeading>Employment</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Company", "col-span-2")}{field("Years")}{field("Monthly income/salary")}</div></section></div>;
  if (section.id === "other") return <div>{field("Real and personal properties owned")}<fieldset className="mt-6"><legend className="text-xs font-semibold uppercase text-[#525252]">Health declaration</legend><div className="mt-3 flex flex-col gap-3 text-sm">{["In good health", "Has pre-existing illness"].map(option => <label key={option}><input required checked={(values["Health declaration"] || "In good health") === option} onChange={() => onFieldChange("Health declaration", option)} type="radio" name="mobile-health" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset></div>;
  if (section.id === "relative") return <div><p className="mb-3 text-sm leading-5 text-[#525252]">Someone who can be reached if the client cannot be.</p><div className="grid gap-4">{field("Name")}{field("Contact number")}{field("Address")}</div></div>;
  if (section.id === "loan") { const schedule = generatePaymentSchedule(values["Loan amount"] ?? "", values.Term ?? ""); return <div><div className="grid gap-4">{field("Loan product")}{field("Loan amount")}{field("Term")}</div><div className="mt-4 border-t border-[#e5e5e5] pt-4"><div className="rounded-xl border border-black/10 bg-[#fafafa] p-3 text-sm text-[#525252] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">Generates the payment schedule<br/>{schedule.length ? <strong className="text-base text-[#404040]">{schedule.length} daily payments of {schedule[0].amount}</strong> : <strong className="text-base text-[#737373]">Enter a loan amount and term</strong>}</div></div></div>; }
  if (section.id === "co-personal") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Name</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Last name", "col-span-2")}{field("First name")}{field("Middle name")}</div></section><section><MobileSectionHeading>Identity</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Date of birth")}{field("Age")}{field("Civil status")}{field("Gender")}{field("Citizenship", "col-span-2")}{field("Place of birth", "col-span-2")}</div></section><section><MobileSectionHeading>Contact</MobileSectionHeading><div className="mt-3 grid gap-4">{field("Contact number")}{field("Email / Facebook address")}{field("Relationship to borrower")}</div></section></div>;
  if (section.id === "co-address") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Home address</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Home address", "col-span-2")}{field("Home barangay")}{field("Home city/town")}{field("Home ZIP code")}{field("Home region")}</div></section><section><MobileSectionHeading>Provincial address</MobileSectionHeading><label className="mt-3 flex items-center text-sm"><input type="checkbox" className="mr-2 accent-[#e11d48]" />Same as home address</label><div className="mt-4 grid grid-cols-2 gap-4">{field("Provincial address", "col-span-2")}{field("Provincial barangay")}{field("Provincial city/town")}{field("Provincial ZIP code")}{field("Provincial region")}</div></section><fieldset><legend className="text-xs font-semibold uppercase text-[#525252]">Present address</legend><div className="mt-3 grid grid-cols-2 gap-3 text-sm">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option}><input required checked={values["Present address"] === option} onChange={() => onFieldChange("Present address", option)} type="radio" name="co-mobile-residence" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset></div>;
  if (section.id === "co-household") return <section><MobileSectionHeading>Children</MobileSectionHeading><div className="mt-3">{field("Number of children")}<p className="mt-1 text-sm text-[#525252]">2 rows generated from the count above.</p><div className="mt-3 flex flex-col gap-3"><button type="button" onClick={onChild} className="flex items-center rounded-xl border border-[#e5e5e5] p-4 text-left"><span className="flex-1"><span className="block text-sm">Ana Dela Cruz</span><span className="text-xs text-[#737373]">Grade 6 · San Roque Elem. · 11</span></span><span>›</span></button><button type="button" onClick={onChild} className="flex items-center rounded-xl border border-red-400 p-4 text-left"><span className="flex-1"><span className="block text-sm">Child 2</span><span className="text-xs text-red-500">Not filled in yet</span></span><span>›</span></button><button type="button" onClick={onChild} className="rounded-lg border border-dashed border-[#d4d4d4] py-3 text-sm font-medium text-[#737373]">＋ Add another child</button></div></div></section>;
  if (section.id === "co-business") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Business</MobileSectionHeading><div className="flex flex-col gap-3">{businesses.map((business, index) => <button key={`${business["Business name"]}-${index}`} type="button" onClick={() => onBusiness(index)} className="first:mt-3 flex w-full items-center rounded-xl border border-[#e5e5e5] p-4 text-left"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#525252]">{business["Business name"]}</span><span className="text-xs text-[#737373]">{[business.Type, business.Address, business.Years && `${business.Years} yrs`].filter(Boolean).join(" · ")}</span></span><span className="text-xl text-[#a3a3a3]">›</span></button>)}</div><button type="button" onClick={() => onBusiness()} className="mt-3 w-full rounded-lg border border-dashed border-[#e5e5e5] py-3 text-sm font-semibold text-[#737373]">＋ {businesses.length ? "Add another business" : "Add business"}</button></section><section><MobileSectionHeading>Income</MobileSectionHeading><div className="mt-3">{field("Gross monthly income")}<p className="mt-2 text-sm text-[#525252]">Combined across all businesses listed above.</p></div></section></div>;
  if (section.id === "co-remarks") return <div><p className="mb-3 text-sm leading-5 text-[#525252]">Your assessment of this co-maker. Visible to the approver.</p>{field("Overall remarks")}<p className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 text-xs leading-[18px] text-[#737373]">Optional, but the approver sees this alongside the co-maker&apos;s details — worth a line on why this person is suitable.</p></div>;
  return <div className="grid gap-4">{section.fields?.map(label => field(label))}</div>;
}

function SectionForm({ section, values = {}, childAdded = false, childData = {}, businesses = [], onFieldChange, onBack, onDone, onChild, onBusiness = () => {} }: { section: FormSection; values?: Record<string, string>; childAdded?: boolean; childData?: Record<string, string>; businesses?: Record<string, string>[]; onFieldChange: (field: string, value: string) => void; onBack: () => void; onDone: () => void; onChild: () => void; onBusiness?: (index?: number) => void }) {
  const [showAddField, setShowAddField] = useState(false);
  const isDocs = section.id === "documents";
  const isSchedule = section.id === "schedule";
  if (isSchedule) return <PaymentSchedule loanValues={values} onBack={onBack} onDone={onDone} />;
  return (
    <PageShell title={section.title} back={onBack} action={<button onClick={onBack} className="text-sm font-semibold text-[#be123c]">Done</button>}>
      <form onSubmit={(e) => { e.preventDefault(); onDone(); }} className="mx-auto max-w-3xl px-4 pb-28 pt-7 lg:px-8">
        <MobileApplicationFields section={section} values={values} childAdded={childAdded} childData={childData} businesses={businesses} onFieldChange={onFieldChange} onChild={onChild} onBusiness={onBusiness} onAddField={() => setShowAddField(true)} />
        {!isDocs && <button className={`${primaryButton} mt-8 w-full`} type="submit">Save & continue</button>}
        {isDocs && <button className={`${primaryButton} mt-8 w-full`} type="submit">Save & continue</button>}
      </form>
      {showAddField && <Modal title="Add field" onClose={() => setShowAddField(false)}><p className="mb-4 text-sm text-[#525252]">Choose what you&apos;d like to add to this submission.</p><button onClick={() => setShowAddField(false)} className="flex w-full items-start gap-3 rounded-xl border border-[#d4d4d4] p-4 text-left"><span className="text-xl">▣</span><span><strong className="block text-sm">Text area</strong><span className="mt-1 block text-sm text-[#525252]">Add a note or remark about this submission</span></span></button><div className="mt-3 flex gap-3 rounded-xl border border-[#d4d4d4] bg-[#fafafa] p-4 text-sm text-[#525252]"><span>ⓘ</span><span>Selecting this will add an open text field below the documents section.</span></div></Modal>}
    </PageShell>
  );
}

function ChildForm({ values, onFieldChange, onBack, onDone }: { values: Record<string, string>; onFieldChange: (field: string, value: string) => void; onBack: () => void; onDone: () => void }) {
  const textField = (label: string) => <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}<input required value={values[label] ?? ""} onChange={event => onFieldChange(label, event.target.value)} className={inputClass} /></label>;
  return <PageShell title="Child 2" back={onBack} action={<button type="button" onClick={onBack} className="text-sm font-semibold text-[#be123c]">Remove</button>}><form onSubmit={event => { event.preventDefault(); onDone(); }} className="mx-auto flex min-h-[calc(100vh-112px)] max-w-3xl flex-col px-4 pb-3 pt-6 lg:px-8">
    <div className="flex flex-col gap-4">
      {textField("Name")}
      {textField("School")}
      {textField("Grade/Course")}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase leading-[18px] text-[#404040]">Date of birth<input required type="date" max={new Date().toISOString().slice(0, 10)} value={values["Date of birth"] ?? ""} onChange={event => { const dateOfBirth = event.target.value; onFieldChange("Date of birth", dateOfBirth); onFieldChange("Age", calculateAge(dateOfBirth)); }} className={`${inputClass} min-w-0 text-[#525252]`} /></label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase leading-[18px] text-[#404040]">Age<input readOnly aria-readonly="true" value={values.Age ?? calculateAge(values["Date of birth"] ?? "")} className={`${inputClass} min-w-0 bg-[#fafafa] text-[#525252]`} /></label>
      </div>
      <p className="border-t border-[#e5e5e5] pt-2 text-sm leading-5 text-[#525252]">Age is calculated from birthday.</p>
    </div>
    <div className="mt-auto border-t border-[#e5e5e5] pt-3"><button className={`${primaryButton} w-full`}>Save &amp; continue</button></div>
  </form></PageShell>;
}

function BusinessForm({ values, number, onBack, onRemove, onSave }: { values: Record<string, string>; number: number; onBack: () => void; onRemove: () => void; onSave: (values: Record<string, string>) => void }) {
  const [draft, setDraft] = useState(values);
  const update = (field: string, value: string) => setDraft(current => ({ ...current, [field]: value }));
  return <PageShell title={`Business ${number}`} back={onBack} action={<button type="button" onClick={onRemove} className="text-sm font-semibold text-[#be123c]">Remove</button>}><form onSubmit={event => { event.preventDefault(); onSave(draft); }} className="mx-auto flex min-h-[calc(100vh-112px)] max-w-3xl flex-col px-4 pb-3 pt-6 lg:px-8">
    <div className="flex flex-col gap-4">{["Business name", "Type", "Address", "Years"].map(label => <label key={label} className="flex flex-col gap-1.5 text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}<input required value={draft[label] ?? ""} onChange={event => update(label, event.target.value)} className={inputClass} /></label>)}</div>
    <div className="mt-auto border-t border-[#e5e5e5] pt-3"><button className={`${primaryButton} w-full`}>Save &amp; continue</button></div>
  </form></PageShell>;
}

function Documents({ onAddField, initialFiles = [], onFilesChange }: { onAddField: () => void; mobileUploadOnly?: boolean; initialFiles?: DocumentMetadata[]; onFilesChange?: (files: DocumentMetadata[]) => void }) {
  const [files, setFiles] = useState<DocumentMetadata[]>(initialFiles);
  const updateFiles = (next: DocumentMetadata[]) => {
    setFiles(next);
    onFilesChange?.(next);
  };
  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextFiles = Array.from(selectedFiles).filter(file => file.size <= 5 * 1024 * 1024).map(file => ({ name: file.name, size: file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`, progress: 100 }));
    updateFiles([...files, ...nextFiles]);
  };
  return <div><label className="flex min-h-[126px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e5e5] text-center"><span className="flex size-10 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_-2px_0_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.08)]"><Image src="/credit-analyst/icons/camera.svg" alt="" width={20} height={20} /></span><span className="mt-3 text-sm leading-5 text-[#525252]"><strong className="font-semibold text-[#be123c]">Click to upload</strong> or take a photo</span><span className="mt-1 text-xs leading-[18px] text-[#525252]">PNG, JPG (max. 5MB)</span><input type="file" accept="image/png,image/jpeg,application/pdf" multiple onChange={event => { addFiles(event.target.files); event.target.value = ""; }} className="sr-only" /></label><div className="mt-4 grid gap-3">{files.map((file, index) => <div key={`${file.name}-${index}`} className="relative flex min-h-[72px] items-start overflow-hidden rounded-xl border border-[#e5e5e5] p-4"><span aria-hidden className="absolute inset-y-0 left-0 hidden bg-[#fafafa] lg:block" style={{ width: file.progress === 100 ? "0" : `${50 + file.progress / 2}%` }} /><div className="relative flex min-w-0 flex-1 items-start gap-2"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} className="shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-5 text-[#404040]">{file.name}</p><div className="mt-0.5 flex items-center gap-2 text-sm leading-5 text-[#525252]"><span>{file.size}</span><span className="h-3 w-px bg-[#d4d4d4]" /><Image src={file.progress === 100 ? "/credit-analyst/icons/check-circle.svg" : "/credit-analyst/icons/upload-cloud.svg"} alt="" width={16} height={16} /><span>{file.progress}%</span></div></div></div><button type="button" onClick={() => updateFiles(files.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="relative -mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md"><Image src="/credit-analyst/icons/trash.svg" alt="" width={16} height={16} /></button></div>)}</div><button type="button" onClick={onAddField} className="mt-6 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:w-auto lg:border-solid"><Image src="/credit-analyst/icons/plus.svg" alt="" width={20} height={20} />Add Field</button></div>;
}

function DesktopApplicationForm({ initialDraft, onCancel, onSaveDraft, onReview }: { initialDraft?: ApplicationDraft | null; onCancel: () => void; onSaveDraft: (draft: DesktopDraftData) => void; onReview: (values: FormDataState) => void }) {
  const [showAddField, setShowAddField] = useState(false);
  const [schedulePage, setSchedulePage] = useState(1);
  const [values, setValues] = useState<FormDataState>(initialDraft?.formData ?? {});
  const [loanAmount, setLoanAmount] = useState(initialDraft?.formData.loan?.["Loan amount"] ?? "");
  const [loanTerm, setLoanTerm] = useState(initialDraft?.formData.loan?.Term ?? "");
  const initialChildren = initialDraft?.desktopChildren?.length ? initialDraft.desktopChildren : Array.from({ length: 2 }, () => ({}));
  const [childrenCount, setChildrenCount] = useState(initialDraft?.formData.personal?.["Number of children"] ?? String(initialChildren.length));
  const [desktopChildren, setDesktopChildren] = useState<Record<string, string>[]>(initialChildren);
  const [desktopBusinesses, setDesktopBusinesses] = useState<Record<string, string>[]>(initialDraft?.desktopBusinesses?.length ? initialDraft.desktopBusinesses : [{}]);
  const [desktopDocuments, setDesktopDocuments] = useState<DocumentMetadata[]>(initialDraft?.desktopDocuments ?? []);
  const [customFields, setCustomFields] = useState<number[]>(initialDraft?.customFields ?? []);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(initialDraft?.formData.__custom ?? {});
  const generatedPayments = generatePaymentSchedule(loanAmount, loanTerm);
  const schedulePageCount = Math.max(1, Math.ceil(generatedPayments.length / 10));
  const changeChildrenCount = (value: string) => {
    const count = Math.min(20, Math.max(0, Math.floor(numericValue(value))));
    setChildrenCount(value);
    setDesktopChildren(current => Array.from({ length: count }, (_, index) => current[index] ?? {}));
  };
  const updateChild = (row: number, field: string, value: string) => setDesktopChildren(current => current.map((child, index) => index === row ? { ...child, [field]: value, ...(field === "Birthday" ? { Age: calculateAge(value) } : {}) } : child));
  const updateBusiness = (row: number, field: string, value: string) => setDesktopBusinesses(current => current.map((business, index) => index === row ? { ...business, [field]: value } : business));
  const updateValue = (sectionId: string, field: string, value: string) => setValues(current => ({
    ...current,
    [sectionId]: {
      ...current[sectionId],
      [field]: value,
      ...(sectionId === "personal" && field === "Date of birth" ? { Age: calculateAge(value) } : {}),
    },
  }));
  const completedValues = (): FormDataState => ({
    ...values,
    personal: {
      ...values.personal,
      "Present address": values.personal?.["Present address"] || "Rented",
      "Number of children": childrenCount,
    },
    other: {
      ...values.other,
      "Health declaration": values.other?.["Health declaration"] || "In good health",
    },
    __children: encodedRows(desktopChildren),
    __businesses: encodedRows(desktopBusinesses),
    __documents: encodedRows(desktopDocuments.map(({ name, size }) => ({ name, size }))),
    __custom: customFieldValues,
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); onReview(completedValues()); }} className="hidden px-8 pb-8 lg:block">
      <div className="mx-auto max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white px-6 pt-6">
        {applicationSections.filter(section => section.id !== "schedule").map(section => (
          <section key={section.id} className="mb-8">
            <h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase tracking-wide text-[#525252]">{section.title}</h2>
            <div className="mt-6">
              {section.id === "documents" ? (
                <><Documents initialFiles={desktopDocuments} onFilesChange={setDesktopDocuments} onAddField={() => setShowAddField(true)} />{customFields.map((fieldId, index) => { const label = `Additional field ${index + 1}`; return <div key={fieldId} className="mt-6 flex items-end gap-3"><div className="flex-1"><FormField label={label} textarea value={customFieldValues[label] ?? ""} onValueChange={value => setCustomFieldValues(current => ({ ...current, [label]: value }))} /></div><button type="button" onClick={() => { setCustomFields(current => current.filter(id => id !== fieldId)); setCustomFieldValues(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== label))); }} className="mb-2 flex size-8 items-center justify-center rounded-md hover:bg-[#fafafa]" aria-label={`Delete additional field ${index + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></div>; })}</>
              ) : (
                <div className={`grid gap-x-6 gap-y-6 ${section.id === "personal" ? "grid-cols-12" : section.id === "business" || section.id === "relative" ? "grid-cols-2" : "grid-cols-3"}`}>
                  {section.fields?.filter(field => section.id !== "business" && !(section.id === "personal" && ["Contact number", "Email / Facebook address"].includes(field))).map(field => (
                    <div key={field} className={section.id === "personal" ? field === "Permanent address" ? "col-span-12" : ["Barangay", "City/Town", "ZIP code", "Region"].includes(field) ? "col-span-3" : ["Contact number", "Email / Facebook address"].includes(field) ? "col-span-6" : "col-span-4" : section.id === "relative" && field === "Address" ? "col-span-2" : section.id === "other" ? "col-span-3" : ""}>
                      <FormField label={field} textarea={field.toLowerCase().includes("properties")} value={values[section.id]?.[field] ?? ""} readOnly={section.id === "personal" && field === "Age"} onValueChange={value => { updateValue(section.id, field, value); if (section.id === "loan" && field === "Loan amount") { setLoanAmount(value); setSchedulePage(1); } if (section.id === "loan" && field === "Term") { setLoanTerm(value); setSchedulePage(1); } }} />
                    </div>
                  ))}
                </div>
              )}
              {section.id === "personal" && <><div className="mt-6 grid grid-cols-2 gap-6"><fieldset><legend className="text-xs font-semibold uppercase text-[#525252]">Present address</legend><div className="mt-3 grid grid-cols-2 gap-3 text-sm">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option}><input required checked={(values.personal?.["Present address"] ?? "Rented") === option} onChange={() => updateValue("personal", "Present address", option)} type="radio" name="residence" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset><FormField label="Number of children" value={childrenCount} onValueChange={value => { changeChildrenCount(value); updateValue("personal", "Number of children", value); }} /></div><div className="mt-6 grid grid-cols-2 gap-6"><FormField label="Contact number" value={values.personal?.["Contact number"] ?? ""} onValueChange={value => updateValue("personal", "Contact number", value)} /><FormField label="Email / Facebook address" value={values.personal?.["Email / Facebook address"] ?? ""} onValueChange={value => updateValue("personal", "Email / Facebook address", value)} /></div><div className="mt-6"><div className="mb-3 flex items-center"><h3 className="text-xs font-semibold uppercase text-[#525252]">Children</h3><span className="ml-auto text-xs text-[#737373]">{desktopChildren.length} {desktopChildren.length === 1 ? "row" : "rows"} generated from the count above</span></div>{desktopChildren.length > 0 && <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Name", "School", "Grade/Course", "Birthday", "Age", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{desktopChildren.map((child, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Name", "School", "Grade/Course", "Birthday", "Age"].map((field, index) => <td key={field} className="px-6"><input type={field === "Birthday" ? "date" : "text"} max={field === "Birthday" ? new Date().toISOString().slice(0, 10) : undefined} readOnly={field === "Age"} value={child[field] ?? ""} onChange={event => updateChild(row, field, event.target.value)} className={`${inputClass} h-9 px-3 text-sm ${field === "Age" ? "bg-[#fafafa]" : ""}`} placeholder={field === "Birthday" ? undefined : ["Full name", "School name", "Grade or course", "", "Age"][index]} /></td>)}<td className="px-4"><button type="button" onClick={() => { setDesktopChildren(current => current.filter((_, index) => index !== row)); setChildrenCount(String(Math.max(0, desktopChildren.length - 1))); }} className="flex size-7 items-center justify-center" aria-label={`Remove child ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></td></tr>)}</tbody></table></div>}<button type="button" onClick={() => { setDesktopChildren(current => [...current, {}]); setChildrenCount(String(desktopChildren.length + 1)); }} className={`${secondaryButton} mt-3 gap-2`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add another child</button></div></>}
              {section.id === "business" && <div>{desktopBusinesses.length > 0 && <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Business name", "Type", "Address", "Years", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{desktopBusinesses.map((business, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Business name", "Type", "Address", "Years"].map(field => <td key={field} className="px-6"><input value={business[field] ?? ""} onChange={event => updateBusiness(row, field, event.target.value)} className={`${inputClass} h-9 px-3 text-sm`} placeholder={field} /></td>)}<td className="px-4"><button type="button" onClick={() => setDesktopBusinesses(current => current.filter((_, index) => index !== row))} className="flex size-7 items-center justify-center" aria-label={`Remove business ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></td></tr>)}</tbody></table></div>}<button type="button" onClick={() => setDesktopBusinesses(current => [...current, {}])} className={`${secondaryButton} mt-3 gap-2`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add another business</button><div className="mt-6 max-w-[512px]"><FormField label="Gross monthly income" value={values.business?.["Gross monthly income"] ?? ""} onValueChange={value => updateValue("business", "Gross monthly income", value)} /></div></div>}
              {section.id === "other" && <fieldset className="mt-6"><legend className="text-xs font-semibold uppercase text-[#525252]">Health declaration</legend><div className="mt-3 flex gap-8 text-sm">{["In good health", "Has pre-existing illness"].map(option => <label key={option}><input required checked={(values.other?.["Health declaration"] || "In good health") === option} onChange={() => updateValue("other", "Health declaration", option)} type="radio" name="health-declaration" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset>}
            </div>
          </section>
        ))}

        <section className="mb-6">
          <h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase tracking-wide text-[#525252]">Projected payment schedule</h2>
          <div className="mt-6 overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <colgroup><col className="w-[120px]" /><col /><col /></colgroup>
              <thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr><th className="px-6">Payment no.</th><th className="px-6">Due date</th><th className="px-6">Amount</th></tr></thead>
              <tbody>{generatedPayments.slice((schedulePage - 1) * 10, schedulePage * 10).map(row => <tr key={row.number} className="h-[72px] border-t border-[#e5e5e5]"><td className="px-6">{row.number}</td><td className="px-6">{row.date}</td><td className="px-6">{row.amount}</td></tr>)}</tbody>
            </table>
            <div className="flex h-16 items-center border-t border-[#e5e5e5] px-6 text-sm"><span>Page {schedulePage} of {schedulePageCount}</span><select className="ml-3 h-9 rounded-lg border border-[#d4d4d4] px-3"><option>10 per page</option></select><button type="button" disabled={schedulePage === 1} onClick={() => setSchedulePage(page => page - 1)} className={`${secondaryButton} ml-auto disabled:opacity-50`}>Previous</button><button type="button" disabled={schedulePage === schedulePageCount} onClick={() => setSchedulePage(page => page + 1)} className={`${secondaryButton} ml-3 disabled:opacity-50`}>Next</button></div>
          </div>
        </section>

        <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-end gap-3 border-t border-[#e5e5e5] bg-white px-6 py-4">
          <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
          <button type="button" onClick={() => onSaveDraft({ formData: completedValues(), desktopChildren, desktopBusinesses, desktopDocuments, customFields })} className={secondaryButton}>Save draft</button>
          <button type="submit" className={primaryButton}>Submit Application</button>
        </div>
      </div>
      {showAddField && <Modal title="Add field" onClose={() => setShowAddField(false)}><p className="mb-4 text-sm text-[#525252]">Choose what you&apos;d like to add to this application.</p><button type="button" onClick={() => { setCustomFields(current => [...current, Date.now()]); setShowAddField(false); }} className="w-full rounded-xl border border-[#d4d4d4] p-4 text-left text-sm"><strong className="block">Text area</strong><span className="mt-1 block text-[#525252]">Add a note or remark about this submission</span></button></Modal>}
    </form>
  );
}

function DesktopCoMakerForm({ loan, onCancel, onSave }: { loan: Submission; onCancel: () => void; onSave: (form: ApplicationFormData) => Promise<string | undefined> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [childrenCount, setChildrenCount] = useState("2");
  const [children, setChildren] = useState<Record<string, string>[]>([{}, {}]);
  const [businesses, setBusinesses] = useState<Record<string, string>[]>([{}, {}]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pendingForm, setPendingForm] = useState<ApplicationFormData>();
  const updateValue = (label: string, value: string) => setValues(current => ({ ...current, [label]: value, ...(label === "Date of birth" ? { Age: calculateAge(value) } : {}) }));
  const changeChildrenCount = (value: string) => {
    const count = Math.min(20, Math.max(0, Math.floor(numericValue(value))));
    setChildrenCount(value);
    setChildren(current => Array.from({ length: count }, (_, index) => current[index] ?? {}));
  };
  const updateChild = (row: number, field: string, value: string) => setChildren(current => current.map((child, index) => index === row ? { ...child, [field]: value, ...(field === "Birthday" ? { Age: calculateAge(value) } : {}) } : child));
  const updateBusiness = (row: number, field: string, value: string) => setBusinesses(current => current.map((business, index) => index === row ? { ...business, [field]: value } : business));
  const sectionTitle = (title: string) => <h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase leading-5 text-[#404040]">{title}</h2>;
  const field = (label: string, className = "") => <div className={className}><FormField label={label} value={values[label] ?? ""} readOnly={label === "Age"} textarea={label === "Overall remarks"} onValueChange={value => updateValue(label, value)} /></div>;
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const submittedForm = new FormData(event.currentTarget);
      const submittedValues: Record<string, string> = {
        ...values,
        "Present address": String(submittedForm.get("presentAddress") ?? ""),
      };
      setError("");
      const personalFields = ["Full name", "Date of birth", "Civil status", "Citizenship", "Gender", "Place of birth", "Contact number", "Email / Facebook address", "Relationship to borrower"];
      const addressFields = ["Home address", "Home barangay", "Home city/town", "Home ZIP code", "Home region", "Provincial address", "Provincial barangay", "Provincial city/town", "Provincial ZIP code", "Provincial region", "Present address"];
      setPendingForm({
        "co-personal": Object.fromEntries(personalFields.map(label => [label, submittedValues[label] ?? ""])),
        "co-address": Object.fromEntries(addressFields.map(label => [label, submittedValues[label] ?? ""])),
        "co-household": { "Number of children": childrenCount },
        "co-business": { "Gross monthly income": submittedValues["Gross monthly income"] ?? "" },
        "co-remarks": { "Overall remarks": submittedValues["Overall remarks"] ?? "" },
        __children: encodedRows(children),
        __businesses: encodedRows(businesses),
      });
    }} className="hidden px-8 pb-8 pt-8 lg:block">
      <div className="mx-auto max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white px-6 pt-6">
        <section>
          {sectionTitle("Loan reference")}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <FormField label="Borrower/Principal loan client" value={loan.name} />
            <FormField label="Loan amount applied" value={loan.amount} />
            <FormField label="Approved amount" value={loan.amount} />
            <FormField label="Loan release date" value="2026-03-05" />
          </div>
        </section>

        <section className="mt-6">
          {sectionTitle("Co-maker personal information")}
          <div className="mt-6 grid grid-cols-3 gap-6">
            {field("Full name", "col-span-3")}
            {field("Age")}{field("Civil status")}{field("Date of birth")}
            {field("Citizenship")}{field("Gender")}{field("Place of birth")}
            {field("Contact number")}{field("Email / Facebook address")}{field("Relationship to borrower")}
            {field("Home address", "col-span-3")}
          </div>
          <div className="mt-6 grid grid-cols-4 gap-6">{field("Home barangay")}{field("Home city/town")}{field("Home ZIP code")}{field("Home region")}</div>
          <div className="mt-6">{field("Provincial address")}</div>
          <div className="mt-6 grid grid-cols-4 gap-6">{field("Provincial barangay")}{field("Provincial city/town")}{field("Provincial ZIP code")}{field("Provincial region")}</div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <fieldset><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">Present address</legend><div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2 text-sm leading-5 text-[#404040]">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option} className="flex items-center gap-2"><input required checked={values["Present address"] === option} onChange={() => updateValue("Present address", option)} type="radio" name="presentAddress" value={option} className="size-4 accent-[#e11d48]" />{option}</label>)}</div></fieldset>
            <FormField label="Number of children" value={childrenCount} onValueChange={changeChildrenCount} />
          </div>
          <div className="mt-6">
            <div className="mb-3 flex items-center"><h3 className="text-xs font-semibold uppercase text-[#404040]">Children</h3><span className="ml-auto text-xs text-[#737373]">{children.length} {children.length === 1 ? "row" : "rows"} generated from the count above</span></div>
            {children.length > 0 && <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Name", "School", "Grade/Course", "Birthday", "Age", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{children.map((child, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Name", "School", "Grade/Course", "Birthday", "Age"].map((childField, index) => <td key={childField} className="px-6"><input type={childField === "Birthday" ? "date" : "text"} max={childField === "Birthday" ? new Date().toISOString().slice(0, 10) : undefined} readOnly={childField === "Age"} value={child[childField] ?? ""} onChange={event => updateChild(row, childField, event.target.value)} className={`${inputClass} h-9 px-3 text-sm ${childField === "Age" ? "bg-[#fafafa]" : ""}`} placeholder={childField === "Birthday" ? undefined : ["Full name", "School name", "Grade or course", "", "Age"][index]} /></td>)}<td className="px-4"><button type="button" onClick={() => { setChildren(current => current.filter((_, index) => index !== row)); setChildrenCount(String(Math.max(0, children.length - 1))); }} className="flex size-7 items-center justify-center" aria-label={`Remove child ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={16} height={16} /></button></td></tr>)}</tbody></table></div>}
            <button type="button" onClick={() => { setChildren(current => [...current, {}]); setChildrenCount(String(children.length + 1)); }} className={`${secondaryButton} mt-3 gap-1`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={20} height={20} />Add another child</button>
          </div>
        </section>

        <section className="mt-8">
          {sectionTitle("Business information")}
          <div className="mt-6 overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Business name", "Type", "Address", "Years", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{businesses.map((business, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Business name", "Type", "Address", "Years"].map(businessField => <td key={businessField} className="px-6"><input value={business[businessField] ?? ""} onChange={event => updateBusiness(row, businessField, event.target.value)} className={`${inputClass} h-9 px-3 text-sm`} placeholder={businessField} /></td>)}<td className="px-4"><button type="button" onClick={() => setBusinesses(current => current.filter((_, index) => index !== row))} className="flex size-7 items-center justify-center" aria-label={`Remove business ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={16} height={16} /></button></td></tr>)}</tbody></table></div>
          <button type="button" onClick={() => setBusinesses(current => [...current, {}])} className={`${secondaryButton} mt-3 gap-1`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={20} height={20} />Add another business</button>
          <div className="mt-6 max-w-[512px]">{field("Gross monthly income")}</div>
        </section>

        <section className="mt-8">
          <div className="h-[163px]">{field("Overall remarks")}</div>
        </section>

        <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-end gap-3 border-t border-[#e5e5e5] bg-white px-6 py-4">
          {error && <p role="alert" className="mr-auto text-sm text-red-700">{error}</p>}
          <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
          <button disabled={pending} type="submit" className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? "Saving…" : "Save co-borrower"}</button>
        </div>
      </div>
      {pendingForm && <SubmitConfirmationModal
        title="Add this co-maker?"
        description={`This will add the co-maker to ${loan.id} — ${loan.name}. The saved co-maker details will be read-only. This cannot be undone.`}
        confirmLabel="Add co-maker"
        pending={pending}
        onCancel={() => setPendingForm(undefined)}
        onConfirm={async () => {
          if (pending) return;
          setPending(true);
          const message = await onSave(pendingForm);
          setPending(false);
          if (message) {
            setError(message);
            setPendingForm(undefined);
          }
        }}
      />}
    </form>
  );
}

function PaymentSchedule({ loanValues, onBack, onDone }: { loanValues: Record<string, string>; onBack: () => void; onDone: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const rows = generatePaymentSchedule(loanValues["Loan amount"] ?? "", loanValues.Term ?? "");
  const total = numericValue(loanValues["Loan amount"] ?? "");
  return <PageShell title="Payment schedule" back={onBack} action={<button onClick={onDone} className="text-sm font-semibold text-[#be123c]">Done</button>}><div className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:px-8">{rows.length ? <><div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4"><p className="text-xs font-semibold uppercase text-[#525252]">Per payment</p><p className="mt-1 text-2xl font-semibold">{rows[0].amount}</p><p className="mt-1 text-sm text-[#737373]">{rows.length} payments · daily · {peso(total)} total</p></div><dl className="mt-5 text-sm"><div className="flex border-b border-[#e5e5e5] py-3"><dt className="text-[#737373]">First due</dt><dd className="ml-auto font-medium">{rows[0].date}</dd></div><div className="flex py-3"><dt className="text-[#737373]">Final due</dt><dd className="ml-auto font-medium">{rows[rows.length - 1].date}</dd></div></dl><h2 className="mt-5 text-xs font-semibold uppercase text-[#525252]">All payments</h2><div className="mt-2">{rows.slice(0, showAll ? rows.length : 6).map(row => <div className="flex border-b border-[#e5e5e5] py-3 text-sm" key={row.number}><span className="text-[#737373]">{row.number} · {row.date}</span><strong className="ml-auto">{row.amount}</strong></div>)}</div>{rows.length > 6 && <button type="button" onClick={() => setShowAll(current => !current)} className="mt-4 text-sm font-semibold text-[#be123c]">{showAll ? "Show fewer payments" : `Show all ${rows.length} payments`}</button>}</> : <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm text-[#525252]">Enter the loan amount and term first to generate a payment schedule.</div>}<button onClick={onDone} className={`${primaryButton} mt-8 w-full`}>Done</button></div></PageShell>;
}

function Review({ values, error, pending, onBack, onSubmit }: { values: FormDataState; error?: string; pending: boolean; onBack: () => void; onSubmit: () => void }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const personal = values.personal ?? {};
  const business = values.business ?? {};
  const household = values.household ?? {};
  const loan = values.loan ?? {};
  const name = [personal["Last name"], [personal["First name"], personal["Middle name"]].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not provided";
  const sections = [{ title: "Personal information", rows: [["Name", name], ["Date of birth", personal["Date of birth"] || "Not provided"], ["Contact", personal["Contact number"] || "Not provided"]] }, { title: "Business & household", rows: [["Gross monthly", business["Gross monthly income"] || "Not provided"], ["Spouse income", household["Monthly income/salary"] || "Not provided"]] }, { title: "Loan details", rows: [["Product", loan["Loan product"] || "Not provided"], ["Amount", loan["Loan amount"] || "Not provided"], ["Term", loan.Term || "Not provided"]] }];
  return <PageShell title="Review & submit" back={onBack}><div className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:px-8"><p className="text-sm leading-6 text-[#525252]">Check the details with your client before submitting. You can’t edit after submission.</p>{sections.map(section => <section key={section.title} className="mt-5"><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#525252]">{section.title}</h2><dl className="mt-2">{section.rows.map(([label,value]) => <div key={label} className="flex py-2 text-sm"><dt className="text-[#737373]">{label}</dt><dd className="ml-auto font-medium">{value}</dd></div>)}</dl><button type="button" onClick={onBack} className="text-sm font-semibold text-[#be123c]">Edit</button></section>)}{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={pending} onClick={() => setShowConfirmation(true)} className={`${primaryButton} mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? "Submitting…" : "Forward application"}</button></div>{showConfirmation && <SubmitConfirmationModal title="Submit this application?" description="This will forward the loan application for processing. Review all borrower and loan details before continuing. This cannot be undone." confirmLabel="Submit application" pending={pending} onCancel={() => setShowConfirmation(false)} onConfirm={() => { setShowConfirmation(false); onSubmit(); }} />}</PageShell>;
}

function ReadOnlyField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={className}><p className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</p><div className="mt-1.5 flex h-10 items-center rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 text-base text-[#525252] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">{value}</div></div>;
}

function ReadOnlySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase leading-5 text-[#404040]">{title}</h2><div className="mt-6">{children}</div></section>;
}

function ReadOnlyTable({ columns, rows, empty }: { columns: string[]; rows: Record<string, string>[]; empty: string }) {
  return rows.length ? <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr>{columns.map(column => <th key={column} className="px-6">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="h-[64px] border-t border-[#e5e5e5]">{columns.map(column => <td key={column} className="px-6 text-[#525252]">{row[column] || "Not provided"}</td>)}</tr>)}</tbody></table></div> : <p className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#737373]">{empty}</p>;
}

function ReadOnlyDocuments({ files }: { files: { name: string; size: string }[] }) {
  return files.length ? <div className="grid gap-3">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-h-[72px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium text-[#404040]">{file.name}</p><p className="text-sm text-[#737373]">{file.size} · Uploaded with application</p></div></div>)}</div> : <p className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#737373]">No supporting documents were attached.</p>;
}

function CoMakerDetailsView({ loan, onBack }: { loan: Submission; onBack: () => void }) {
  const coMaker = loan.coMaker;
  if (!coMaker) return null;

  const display = (value?: string) => value || "Not provided";
  return (
    <PageShell
      title="Co-maker details"
      desktopTitle="Co-maker details"
      supportingText="Review the co-maker attached to this loan application."
      back={onBack}
    >
      <main className="mx-auto w-full max-w-[1096px] px-4 pb-12 pt-6 lg:px-8 lg:pt-0">
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:p-6">
          <div className="space-y-8">
            <ReadOnlySection title="Loan reference">
              <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
                <ReadOnlyField label="Borrower / principal loan client" value={loan.name} />
                <ReadOnlyField label="Loan ID" value={loan.id} />
                <ReadOnlyField label="Loan amount" value={loan.amount} />
                <ReadOnlyField label="Term" value={loan.term} />
              </div>
            </ReadOnlySection>

            <ReadOnlySection title="Co-maker personal information">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                <ReadOnlyField label="Full name" value={coMaker.fullName} className="sm:col-span-2 lg:col-span-3" />
                <ReadOnlyField label="Age" value={coMaker.dateOfBirth ? calculateAge(coMaker.dateOfBirth) : "Not provided"} />
                <ReadOnlyField label="Civil status" value={display(coMaker.civilStatus)} />
                <ReadOnlyField label="Date of birth" value={display(coMaker.dateOfBirth)} />
                <ReadOnlyField label="Citizenship" value={display(coMaker.citizenship)} />
                <ReadOnlyField label="Gender" value={display(coMaker.gender)} />
                <ReadOnlyField label="Place of birth" value={display(coMaker.placeOfBirth)} />
                <ReadOnlyField label="Contact number" value={display(coMaker.contactNumber)} />
                <ReadOnlyField label="Email / Facebook address" value={display(coMaker.email)} />
                <ReadOnlyField label="Relationship to borrower" value={display(coMaker.relationshipToBorrower)} />
              </div>
            </ReadOnlySection>

            <ReadOnlySection title="Address information">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <ReadOnlyField label="Home address" value={coMaker.homeAddress} className="sm:col-span-2 lg:col-span-4" />
                <ReadOnlyField label="Barangay" value={coMaker.barangay} />
                <ReadOnlyField label="City / Town" value={coMaker.cityTown} />
                <ReadOnlyField label="ZIP code" value={coMaker.zipCode} />
                <ReadOnlyField label="Region" value={coMaker.region} />
                <ReadOnlyField label="Present address status" value={display(coMaker.presentAddressStatus)} className="sm:col-span-2" />
                <ReadOnlyField label="Present address" value={display(coMaker.presentAddress)} className="sm:col-span-2" />
                <ReadOnlyField label="Provincial address" value={display(coMaker.provincialAddress)} className="sm:col-span-2 lg:col-span-4" />
                <ReadOnlyField label="Provincial barangay" value={display(coMaker.provincialBarangay)} />
                <ReadOnlyField label="Provincial city / town" value={display(coMaker.provincialCityTown)} />
                <ReadOnlyField label="Provincial ZIP code" value={display(coMaker.provincialZipCode)} />
                <ReadOnlyField label="Provincial region" value={display(coMaker.provincialRegion)} />
              </div>
            </ReadOnlySection>

            <ReadOnlySection title="Household information">
              <ReadOnlyField label="Number of children" value={display(coMaker.numberOfChildren)} className="max-w-[512px]" />
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase text-[#404040]">Children</p>
                <ReadOnlyTable columns={["Name", "School", "Grade/Course", "Birthday", "Age"]} rows={coMaker.children} empty="No children were added for this co-maker." />
              </div>
            </ReadOnlySection>

            <ReadOnlySection title="Business information">
              <ReadOnlyTable columns={["Business name", "Type", "Address", "Years"]} rows={coMaker.businesses} empty="No businesses were added for this co-maker." />
              <ReadOnlyField label="Gross monthly income" value={display(coMaker.grossMonthlyIncome)} className="mt-6 max-w-[512px]" />
            </ReadOnlySection>

            <ReadOnlySection title="Overall remarks">
              <p className="min-h-24 rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 py-3 text-sm leading-6 text-[#525252] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                {display(coMaker.overallRemarks)}
              </p>
            </ReadOnlySection>
          </div>

          <div className="-mx-4 -mb-4 mt-8 flex border-t border-[#e5e5e5] px-4 py-4 lg:-mx-6 lg:-mb-6 lg:justify-end lg:px-6">
            <button onClick={onBack} className={`${secondaryButton} w-full lg:w-auto`}>Back</button>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

function DesktopSubmissionView({ loan, onBack }: { loan: Submission; onBack: () => void }) {
  const [schedulePage, setSchedulePage] = useState(1);
  const fullSchedule = generatePaymentSchedule(loan.amount, loan.term);
  const schedulePageCount = Math.max(1, Math.ceil(fullSchedule.length / 10));
  const rows = fullSchedule.slice((schedulePage - 1) * 10, schedulePage * 10);
  const details = loan.details;
  const display = (value?: string) => value || "Not provided";
  return <main className="min-h-screen bg-white px-8 pb-12 pt-8">
    <header className="mx-auto max-w-[1096px]">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} />Back to my submissions</button>
      <div className="mt-4 flex items-center gap-2"><h1 className="text-xl font-semibold leading-[30px] text-[#171717]">{loan.id} — {loan.name}</h1><StatusBadge status={loan.status} /></div>
      <p className="text-base leading-6 text-[#525252]">Submitted {loan.submitted} · Read-only — submitted applications cannot be edited.</p>
    </header>
    <div className="mx-auto mt-8 max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white p-6">
      <div className="space-y-8">
        <ReadOnlySection title="Personal information"><div className="grid grid-cols-3 gap-x-6 gap-y-6">
          <ReadOnlyField label="Last name" value={display(details?.lastName)} /><ReadOnlyField label="First name" value={display(details?.firstName)} /><ReadOnlyField label="Middle name" value={display(details?.middleName)} />
          <ReadOnlyField label="Age" value={details?.dateOfBirth ? calculateAge(details.dateOfBirth) : "Not provided"} /><ReadOnlyField label="Civil status" value={display(details?.civilStatus)} /><ReadOnlyField label="Date of birth" value={display(details?.dateOfBirth)} />
          <ReadOnlyField label="Citizenship" value={display(details?.citizenship)} /><ReadOnlyField label="Gender" value={display(details?.gender)} /><ReadOnlyField label="Place of birth" value={display(details?.placeOfBirth)} />
          <ReadOnlyField label="Permanent address" value={display(details?.permanentAddress)} className="col-span-3" />
          <ReadOnlyField label="Barangay" value={display(details?.permanentBarangay)} /><ReadOnlyField label="City/Town" value={display(details?.permanentCityTown)} /><div className="grid grid-cols-2 gap-6"><ReadOnlyField label="ZIP code" value={display(details?.permanentZipcode)} /><ReadOnlyField label="Region" value={display(details?.permanentRegion)} /></div>
          <fieldset className="col-span-2"><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">Present address</legend><div className="mt-1.5 grid grid-cols-2 gap-y-2 text-sm text-[#525252]">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option} className="flex items-center gap-2"><input type="radio" checked={details?.presentAddress === option} readOnly className="accent-[#e11d48]" />{option}</label>)}</div></fieldset>
          <ReadOnlyField label="Number of children" value={display(details?.numberOfChildren)} />
          <ReadOnlyField label="Contact number" value={display(details?.contactNumber)} /><ReadOnlyField label="Email / Facebook address" value={display(details?.emailFacebookAddress)} className="col-span-2" />
          <div className="col-span-3"><p className="mb-3 text-xs font-semibold uppercase leading-[18px] text-[#404040]">Children</p><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="px-6">Name</th><th className="px-6">School</th><th className="px-6">Grade/Course</th><th className="px-6">Birthday</th><th className="w-[118px] px-6">Age</th></tr></thead><tbody>{details?.children?.length ? details.children.map((child, index) => <tr key={index} className="h-[72px] border-t border-[#e5e5e5] text-[#404040]"><td className="px-6">{display(child.Name)}</td><td className="px-6">{display(child.School)}</td><td className="px-6">{display(child["Grade/Course"])}</td><td className="px-6">{display(child.Birthday)}</td><td className="px-6">{display(child.Age)}</td></tr>) : <tr className="h-[72px] border-t border-[#e5e5e5]"><td colSpan={5} className="px-6 text-[#737373]">No children were added to this application.</td></tr>}</tbody></table></div></div>
        </div></ReadOnlySection>
        <ReadOnlySection title="Business information"><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="w-[35%] px-6">Business name</th><th className="w-[18%] px-6">Type</th><th className="px-6">Address</th><th className="w-[15%] px-6">Years</th></tr></thead><tbody>{details?.businesses?.length ? details.businesses.map((business, index) => <tr key={index} className="h-[72px] border-t border-[#e5e5e5]"><td className="px-6">{display(business["Business name"])}</td><td className="px-6">{display(business.Type)}</td><td className="px-6">{display(business.Address)}</td><td className="px-6">{display(business.Years)}</td></tr>) : <tr className="h-[72px] border-t border-[#e5e5e5]"><td colSpan={4} className="px-6 text-[#737373]">No businesses were added to this application.</td></tr>}</tbody></table></div><ReadOnlyField label="Gross monthly income" value={display(details?.grossMonthlyIncome)} className="mt-6 w-[512px]" /></ReadOnlySection>
        <ReadOnlySection title="Household information"><div className="grid grid-cols-3 gap-x-6 gap-y-6"><ReadOnlyField label="Spouse name" value={display(details?.spouseName)} /><ReadOnlyField label="Occupation" value={display(details?.spouseOccupation)} /><ReadOnlyField label="Age" value={display(details?.spouseAge)} /><ReadOnlyField label="Company" value={display(details?.spouseCompany)} /><ReadOnlyField label="Years" value={display(details?.spouseYearsEmployed)} /><ReadOnlyField label="Monthly income/salary" value={display(details?.spouseMonthlyIncome)} /></div></ReadOnlySection>
        <ReadOnlySection title="Other information"><ReadOnlyField label="Real and personal properties owned" value={display(details?.realAndPersonalProperties)} className="[&>div]:h-[126px] [&>div]:items-start [&>div]:pt-3" /><fieldset className="mt-6"><legend className="text-xs font-semibold uppercase text-[#404040]">Health declaration</legend><div className="mt-2 flex gap-8 text-sm text-[#525252]">{["In good health", "Has pre-existing illness"].map(option => <label key={option} className="flex items-center gap-2"><input type="radio" checked={details?.healthDeclaration === option} readOnly className="accent-[#e11d48]" />{option}</label>)}</div></fieldset></ReadOnlySection>
        <ReadOnlySection title="Nearest relative to contact"><div className="grid grid-cols-2 gap-6"><ReadOnlyField label="Name" value={display(details?.relativeName)} /><ReadOnlyField label="Contact number" value={display(details?.relativeContactNumber)} /><ReadOnlyField label="Address" value={display(details?.relativeAddress)} className="col-span-2" /></div></ReadOnlySection>
        <ReadOnlySection title="Loan details"><div className="grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value={loan.product || "Not provided"} /><ReadOnlyField label="Loan amount" value={loan.amount} /><ReadOnlyField label="Term" value={loan.term} /></div></ReadOnlySection>
        <ReadOnlySection title="Supporting documents">{details?.supportingDocuments?.length ? <div className="space-y-3">{details.supportingDocuments.map((file, index) => <div key={`${file.name}-${index}`} className="flex h-[70px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium text-[#404040]">{file.name}</p><p className="text-xs text-[#737373]">{file.size} · Uploaded {loan.submitted}</p></div></div>)}</div> : <p className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#737373]">No supporting documents were attached.</p>}</ReadOnlySection>
        <ReadOnlySection title="Projected payment schedule"><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[120px]" /><col /><col /></colgroup><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="px-6">Payment no.</th><th className="px-6">Due date</th><th className="px-6">Amount</th></tr></thead><tbody>{rows.map(row => <tr key={row.number} className="h-[72px] border-t border-[#e5e5e5] font-medium"><td className="px-6">{row.number}</td><td className="px-6">{row.date}</td><td className="px-6">{row.amount}</td></tr>)}</tbody></table><div className="flex h-16 items-center border-t border-[#e5e5e5] px-6 text-sm"><span>Page {schedulePage} of {schedulePageCount}</span><select className="ml-3 h-9 w-32 rounded-lg border border-[#d4d4d4] px-3"><option>10 per page</option></select><button type="button" disabled={schedulePage === 1} onClick={() => setSchedulePage(page => page - 1)} className={`${secondaryButton} ml-auto disabled:opacity-50`}>Previous</button><button type="button" disabled={schedulePage === schedulePageCount} onClick={() => setSchedulePage(page => page + 1)} className={`${secondaryButton} ml-3 disabled:opacity-50`}>Next</button></div></div></ReadOnlySection>
      </div>
      <div className="-mx-6 -mb-6 mt-6 flex h-[69px] items-center justify-end border-t border-[#e5e5e5] px-6"><button onClick={onBack} className={secondaryButton}>Back to my submissions</button></div>
    </div>
  </main>;
}

function SubmissionView({ loan, coMakerPending, onBack, onCoMaker }: { loan: Submission; coMakerPending: boolean; onBack: () => void; onCoMaker: () => void }) {
  const [expanded, setExpanded] = useState("personal");
  const [showMobilePayments, setShowMobilePayments] = useState(false);
  const details = loan.details;
  const display = (value?: string) => value || "Not provided";
  const schedule = generatePaymentSchedule(loan.amount, loan.term);
  const sections = [
    { id: "personal", title: "Personal information", summary: loan.name, rows: [["Name", loan.name], ["Civil status", display(details?.civilStatus)], ["Date of birth", display(details?.dateOfBirth)], ["Citizenship / Gender", [details?.citizenship, details?.gender].filter(Boolean).join(" · ") || "Not provided"], ["Place of birth", display(details?.placeOfBirth)], ["Permanent address", display(details?.permanentAddress)], ["Barangay", display(details?.permanentBarangay)], ["City/Town", display(details?.permanentCityTown)], ["ZIP code", display(details?.permanentZipcode)], ["Region", display(details?.permanentRegion)], ["Present address", display(details?.presentAddress)], ["Number of children", display(details?.numberOfChildren)], ["Contact", display(details?.contactNumber)], ["Email / Facebook", display(details?.emailFacebookAddress)]] },
    { id: "business", title: "Business information", summary: display(details?.grossMonthlyIncome), rows: [["Gross monthly income", display(details?.grossMonthlyIncome)]] },
    { id: "household", title: "Household information", summary: [details?.spouseName, details?.spouseOccupation].filter(Boolean).join(" · ") || "Not provided", rows: [["Spouse", display(details?.spouseName)], ["Occupation", display(details?.spouseOccupation)], ["Company", display(details?.spouseCompany)], ["Monthly income", display(details?.spouseMonthlyIncome)]] },
    { id: "other", title: "Other information", summary: display(details?.healthDeclaration), rows: [["Real and personal properties owned", display(details?.realAndPersonalProperties)], ["Health declaration", display(details?.healthDeclaration)]] },
    { id: "relative", title: "Nearest relative", summary: [details?.relativeName, details?.relativeContactNumber].filter(Boolean).join(" · ") || "Not provided", rows: [["Name", display(details?.relativeName)], ["Contact", display(details?.relativeContactNumber)], ["Address", display(details?.relativeAddress)]] },
    { id: "loan", title: "Loan details", summary: `${loan.amount} · ${loan.term}`, rows: [["Product", loan.product || "Not provided"], ["Amount", loan.amount], ["Term", loan.term]] },
    { id: "documents", title: "Supporting documents", summary: `${details?.supportingDocuments?.length ?? 0} files`, rows: [] },
    { id: "schedule", title: "Payment schedule", summary: `${loan.term} · ${loan.amount}`, rows: [] },
  ];
  return <><div className="hidden lg:block"><DesktopSubmissionView loan={loan} onBack={onBack} /></div><div className="lg:hidden"><PageShell title={loan.id} back={onBack} action={<StatusBadge status={loan.status} />}>
    <div className="mx-auto w-full max-w-[1096px] px-4 pb-24 pt-6">
      <div className="mb-4 lg:hidden"><h2 className="text-lg font-semibold text-[#171717]">{loan.name}</h2><p className="text-xs text-[#737373]">{loan.amount} · {loan.product || "Loan"} · {loan.term}</p></div>
      <p className="rounded-lg bg-[#f5f5f5] px-3 py-2.5 text-xs leading-[18px] text-[#737373]">Submitted {loan.submitted} · Read-only — submitted applications cannot be edited.</p>
      <div className="mt-4 lg:mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:p-6">
        {sections.map(section => <section key={section.id} className="border-b border-[#e5e5e5] py-3 lg:mb-8 lg:border-0 lg:py-0"><button type="button" onClick={() => setExpanded(current => current === section.id ? "" : section.id)} className="flex w-full items-center text-left lg:pointer-events-none"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold uppercase text-[#404040]">{section.title}</span><span className="block truncate text-xs text-[#737373] lg:hidden">{section.summary}</span></span><span className="text-base text-[#737373] lg:hidden">{expanded === section.id ? "−" : "+"}</span></button>
          <div className={`${expanded === section.id ? "block" : "hidden"} lg:block`}>
            {section.rows.length > 0 && <dl className="mt-3 grid gap-x-6 lg:grid-cols-3">{section.rows.map(([label, value]) => <div key={label} className="flex justify-between py-1.5 lg:block lg:py-3"><dt className="text-xs text-[#737373] lg:font-semibold lg:uppercase">{label}</dt><dd className="text-right text-sm font-medium text-[#171717] lg:mt-1 lg:text-left lg:text-base">{value}</dd></div>)}</dl>}
            {section.id === "personal" && <div className="mt-3"><p className="mb-2 text-xs font-semibold uppercase text-[#525252]">Children</p><ReadOnlyTable columns={["Name", "School", "Grade/Course", "Birthday", "Age"]} rows={details?.children ?? []} empty="No children were added to this application." /></div>}
            {section.id === "business" && <div className="mt-3"><ReadOnlyTable columns={["Business name", "Type", "Address", "Years"]} rows={details?.businesses ?? []} empty="No businesses were added to this application." /></div>}
            {section.id === "documents" && <div className="mt-3"><ReadOnlyDocuments files={details?.supportingDocuments ?? []} /></div>}
            {section.id === "schedule" && <div className="mt-3">{schedule.length ? <><p className="text-[10px] font-semibold uppercase leading-[14px] text-[#737373]">Per payment</p><p className="text-2xl font-semibold leading-[30px]">{schedule[0].amount}</p><p className="text-xs leading-[18px] text-[#737373]">{schedule.length} payments · daily · {loan.amount} total</p><div className="mt-3 flex py-1.5 text-xs"><span className="text-[#737373]">First due</span><span className="ml-auto text-sm font-medium text-[#171717]">{schedule[0].date}</span></div><div className="flex py-1.5 text-xs"><span className="text-[#737373]">Final due</span><span className="ml-auto text-sm font-medium text-[#171717]">{schedule[schedule.length - 1].date}</span></div><button type="button" onClick={() => setShowMobilePayments(current => !current)} className="mt-3 text-sm font-semibold leading-5 text-[#be123c]">{showMobilePayments ? "Hide payments" : `Show all ${schedule.length} payments`}</button>{showMobilePayments && <div className="mt-3 overflow-hidden rounded-lg border border-[#e5e5e5]">{schedule.map(row => <div key={row.number} className="flex min-h-12 items-center border-b border-[#e5e5e5] px-3 py-2 text-sm last:border-b-0"><span className="w-9 shrink-0 text-xs font-semibold text-[#737373]">{row.number}</span><span className="text-[#525252]">{row.date}</span><span className="ml-auto font-medium text-[#171717]">{row.amount}</span></div>)}</div>}</> : <p className="text-sm text-[#737373]">Payment schedule unavailable.</p>}</div>}
          </div>
        </section>)}
      </div>
      <button disabled={coMakerPending} onClick={onCoMaker} className={`${secondaryButton} mt-6 w-full disabled:cursor-wait disabled:opacity-60`}>{coMakerPending ? "Loading co-maker…" : loan.coMaker ? "View co-maker" : "Add co-maker"}</button>
    </div>
  </PageShell></div></>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-1 flex items-center"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} className="ml-auto text-2xl text-[#a3a3a3]">×</button></div>{children}</div></div>;
}

function SubmitConfirmationModal({ title, description, confirmLabel, pending = false, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; pending?: boolean; onCancel: () => void; onConfirm: () => void | Promise<void> }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="submit-confirmation-title" aria-describedby="submit-confirmation-description" className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
    <button type="button" aria-label="Close confirmation dialog" disabled={pending} onClick={onCancel} className="absolute inset-0 cursor-default bg-[#0a0a0a]/70 backdrop-blur-[2px] disabled:cursor-wait" />
    <div className="relative w-full max-w-[420px] rounded-xl bg-white px-5 pb-5 pt-4 shadow-2xl lg:px-6 lg:pb-6 lg:pt-5">
      <div aria-hidden className="flex size-7 items-center justify-center rounded-md border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <span className="flex size-3.5 items-center justify-center rounded-full border border-[#f59e0b] text-[10px] font-bold leading-none text-[#d97706]">!</span>
      </div>
      <button type="button" aria-label="Close" disabled={pending} onClick={onCancel} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg disabled:cursor-wait disabled:opacity-50 lg:right-4 lg:top-4"><Image src="/credit-analyst/icons/x-close.svg" alt="" width={18} height={18} /></button>
      <h2 id="submit-confirmation-title" className="mt-3 pr-10 text-base font-semibold leading-6 text-[#171717]">{title}</h2>
      <p id="submit-confirmation-description" className="mt-1 text-sm leading-5 text-[#525252]">{description}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={onCancel} className="h-10 rounded-lg border border-[#d4d4d4] bg-white text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:opacity-50">Cancel</button>
        <button type="button" disabled={pending} onClick={() => void onConfirm()} className="h-10 rounded-lg bg-[#e11d48] px-3 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] hover:bg-[#be123c] disabled:cursor-wait disabled:opacity-60">{pending ? "Submitting…" : confirmLabel}</button>
      </div>
    </div>
  </div>;
}

export default function CreditAnalystApp({ userProfile, initialSubmissions, loadError }: { userProfile: UserProfileIdentity; initialSubmissions: Submission[]; loadError?: string }) {
  const [screen, setScreen] = useState<Screen>({ type: "dashboard" });
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [completedApplicationSections, setCompletedApplicationSections] = useState<Set<string>>(new Set());
  const [startedApplicationSections, setStartedApplicationSections] = useState<Set<string>>(new Set());
  const [completedCoMakerSections, setCompletedCoMakerSections] = useState<Set<string>>(new Set());
  const [startedCoMakerSections, setStartedCoMakerSections] = useState<Set<string>>(new Set());
  const [applicationFormData, setApplicationFormData] = useState<FormDataState>({});
  const [coMakerFormData, setCoMakerFormData] = useState<FormDataState>({});
  const [childData, setChildData] = useState<Record<string, string>>({});
  const [coMakerChildData, setCoMakerChildData] = useState<Record<string, string>>({});
  const [childAdded, setChildAdded] = useState(false);
  const [businesses, setBusinesses] = useState<Record<string, string>[]>([]);
  const [coBorrowerBusinesses, setCoBorrowerBusinesses] = useState<Record<string, string>[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coMakerError, setCoMakerError] = useState("");
  const [coMakerSubmitting, setCoMakerSubmitting] = useState(false);
  const [coMakerLoadingLoanId, setCoMakerLoadingLoanId] = useState<string>();
  const [coMakerLoadError, setCoMakerLoadError] = useState("");
  const [showMobileCoMakerConfirmation, setShowMobileCoMakerConfirmation] = useState(false);
  useEffect(() => {
    const loanIds = initialSubmissions.flatMap(loan =>
      loan.databaseId ? [loan.databaseId] : [],
    );
    if (!loanIds.length) return;

    let active = true;
    void getLoanCoMakers(loanIds).then(result => {
      if (!active) return;
      if (!result.ok) {
        setCoMakerLoadError(result.error);
        return;
      }

      setSubmissions(current => current.map(loan => {
        if (!loan.databaseId) return loan;
        const coMaker = result.coMakers[loan.databaseId];
        return { ...loan, hasCoMaker: Boolean(coMaker), coMaker };
      }));
    });

    return () => { active = false; };
  }, [initialSubmissions]);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(applicationDraftKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as ApplicationDraft;
      if (parsed.version === 1 && parsed.formData && parsed.updatedAt) {
        queueMicrotask(() => setDraft(parsed));
      }
    } catch {
      window.localStorage.removeItem(applicationDraftKey);
    }
  }, []);
  const addToSet = (setter: (value: Set<string>) => void, current: Set<string>, id: string) => setter(new Set(current).add(id));
  const updateSectionData = (setter: (updater: (current: FormDataState) => FormDataState) => void, sectionId: string, field: string, value: string) => setter(current => ({ ...current, [sectionId]: { ...current[sectionId], [field]: value } }));
  const active = screen.type === "dashboard" || screen.type === "submission" || screen.type === "co-maker-view" ? "submissions" : "application";
  const navigate = (target: "submissions" | "application") => { setScreen(target === "submissions" ? { type: "dashboard" } : { type: "application" }); setMenuOpen(false); };
  const resetApplication = () => {
    setApplicationFormData({});
    setCompletedApplicationSections(new Set());
    setStartedApplicationSections(new Set());
    setChildData({});
    setChildAdded(false);
    setBusinesses([]);
    setSubmitError("");
  };
  const startNewApplication = () => {
    resetApplication();
    setEditingDraft(false);
    setScreen({ type: "application" });
  };
  const startCoMaker = (loan: Submission) => {
    setCoMakerFormData({});
    setCompletedCoMakerSections(new Set());
    setStartedCoMakerSections(new Set());
    setCoMakerChildData({});
    setCoBorrowerBusinesses([]);
    setCoMakerError("");
    setScreen({ type: "co-maker", loan });
  };
  const openCoMaker = (
    loan: Submission,
    returnTo: "dashboard" | "submission",
  ) => {
    if (coMakerLoadingLoanId) return;
    if (!loan.databaseId) {
      if (loan.coMaker) setScreen({ type: "co-maker-view", loan, returnTo });
      else startCoMaker(loan);
      return;
    }

    setCoMakerLoadingLoanId(loan.id);
    setCoMakerLoadError("");
    void getLoanCoMaker(loan.databaseId).then(result => {
      if (!result.ok) {
        setCoMakerLoadError(result.error);
        return;
      }

      const freshLoan = {
        ...loan,
        hasCoMaker: Boolean(result.coMaker),
        coMaker: result.coMaker,
      };
      setSubmissions(current => current.map(item =>
        item.databaseId === loan.databaseId ? freshLoan : item,
      ));

      if (result.coMaker) {
        setScreen({ type: "co-maker-view", loan: freshLoan, returnTo });
      } else {
        startCoMaker(freshLoan);
      }
    }).catch(() => {
      setCoMakerLoadError("The co-maker details could not be loaded. Please try again.");
    }).finally(() => setCoMakerLoadingLoanId(undefined));
  };
  const persistDraft = (desktopDraft?: DesktopDraftData) => {
    const nextDraft: ApplicationDraft = {
      version: 1,
      formData: desktopDraft?.formData ?? applicationFormData,
      completedSectionIds: [...completedApplicationSections],
      startedSectionIds: [...startedApplicationSections],
      childData,
      childAdded,
      businesses,
      desktopChildren: desktopDraft?.desktopChildren ?? draft?.desktopChildren ?? [],
      desktopBusinesses: desktopDraft?.desktopBusinesses ?? draft?.desktopBusinesses ?? [],
      desktopDocuments: desktopDraft?.desktopDocuments ?? draft?.desktopDocuments ?? [],
      customFields: desktopDraft?.customFields ?? draft?.customFields ?? [],
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(applicationDraftKey, JSON.stringify(nextDraft));
    setDraft(nextDraft);
    setApplicationFormData(nextDraft.formData);
    setEditingDraft(false);
    setScreen({ type: "dashboard" });
  };
  const resumeDraft = () => {
    if (!draft) return;
    setApplicationFormData(draft.formData);
    setCompletedApplicationSections(new Set(draft.completedSectionIds));
    setStartedApplicationSections(new Set(draft.startedSectionIds));
    setChildData(draft.childData);
    setChildAdded(draft.childAdded);
    setBusinesses(draft.businesses);
    setEditingDraft(true);
    setScreen({ type: "application" });
  };
  const discardDraft = () => {
    window.localStorage.removeItem(applicationDraftKey);
    setDraft(null);
    setEditingDraft(false);
    resetApplication();
    setScreen({ type: "dashboard" });
  };
  const submitApplication = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    const mobileDocuments = decodedDocuments(applicationFormData.documents?.__files).map(({ name, size }) => ({ name, size }));
    const submissionData = {
      ...applicationFormData,
      personal: {
        ...applicationFormData.personal,
        "Present address": applicationFormData.personal?.["Present address"] || "Rented",
      },
      other: {
        ...applicationFormData.other,
        "Health declaration": applicationFormData.other?.["Health declaration"] || "In good health",
      },
      __children: applicationFormData.__children ?? encodedRows(childAdded ? [childData] : []),
      __businesses: applicationFormData.__businesses ?? encodedRows(businesses),
      __documents: applicationFormData.__documents ?? encodedRows(mobileDocuments),
    };
    const result = await createLoanApplication(submissionData);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmissions(current => [result.loan, ...current]);
    window.localStorage.removeItem(applicationDraftKey);
    setDraft(null);
    setEditingDraft(false);
    resetApplication();
    setScreen({ type: "dashboard" });
  };
  const submitCoMaker = async (
    loan: Submission,
    form: ApplicationFormData,
  ): Promise<string | undefined> => {
    if (coMakerSubmitting) return "The co-maker is already being saved.";
    if (!loan.databaseId) {
      const message = "This loan is not linked to a database record.";
      setCoMakerError(message);
      return message;
    }

    setCoMakerSubmitting(true);
    setCoMakerError("");
    const result = await createLoanCoMaker(loan.databaseId, form);
    setCoMakerSubmitting(false);

    if (!result.ok) {
      setCoMakerError(result.error);
      return result.error;
    }

    const savedLoan = {
      ...loan,
      hasCoMaker: true,
      coMaker: result.coMaker,
    };
    setSubmissions(current =>
      current.map(item => item.databaseId === loan.databaseId ? savedLoan : item),
    );
    setCoMakerFormData({});
    setCompletedCoMakerSections(new Set());
    setStartedCoMakerSections(new Set());
    setCoMakerChildData({});
    setCoBorrowerBusinesses([]);
    setScreen({ type: "submission", loan: savedLoan });
    return undefined;
  };
  const navProps = { active, mobileOpen: menuOpen, userProfile, onClose: () => setMenuOpen(false), onNavigate: navigate } as const;
  const reviewedChildren = decodedRows(applicationFormData.__children);
  const reviewedBusinesses = decodedRows(applicationFormData.__businesses);
  const reviewedDocuments = decodedRows(applicationFormData.__documents).map(document => ({ name: document.name ?? "Document", size: document.size ?? "Unknown size", progress: 100 }));
  const restoredApplication: ApplicationDraft = {
    version: 1,
    formData: applicationFormData,
    completedSectionIds: [...completedApplicationSections],
    startedSectionIds: [...startedApplicationSections],
    childData,
    childAdded,
    businesses,
    desktopChildren: reviewedChildren.length ? reviewedChildren : editingDraft ? draft?.desktopChildren ?? [] : [],
    desktopBusinesses: reviewedBusinesses.length ? reviewedBusinesses : editingDraft ? draft?.desktopBusinesses ?? [] : [],
    desktopDocuments: reviewedDocuments.length ? reviewedDocuments : editingDraft ? draft?.desktopDocuments ?? [] : [],
    customFields: Object.keys(applicationFormData.__custom ?? {}).length ? Object.keys(applicationFormData.__custom).map((_, index) => index) : editingDraft ? draft?.customFields ?? [] : [],
    updatedAt: draft?.updatedAt ?? "",
  };
  let content: ReactNode;
  if (screen.type === "dashboard") content = <Dashboard submissions={submissions} loadError={loadError} coMakerLoadingLoanId={coMakerLoadingLoanId} draft={draft} onNew={startNewApplication} onResumeDraft={resumeDraft} onDiscardDraft={discardDraft} onView={loan => setScreen({ type: "submission", loan })} onCoMaker={loan => openCoMaker(loan, "dashboard")} />;
  else if (screen.type === "application") content = (
    <PageShell title={[applicationFormData.personal?.["First name"], applicationFormData.personal?.["Last name"]].filter(Boolean).join(" ") || "New application"} desktopTitle="New loan application" supportingText="Fill in the client's details and submit for review." back={() => setScreen({ type: "dashboard" })} action={<button onClick={discardDraft} className="text-sm font-semibold text-[#be123c]">Discard</button>}>
      <div className="lg:hidden">
        <div className="px-4 pt-8"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-[#525252]">Not yet submitted · Saved on this device</p></div></div>
        <Checklist sections={applicationSections} sectionData={applicationFormData} completedIds={completedApplicationSections} startedIds={startedApplicationSections} onSection={sectionId => setScreen({ type: "section", sectionId })} onSaveDraft={() => persistDraft()} onReview={() => setScreen({ type: "review" })} />
      </div>
      <DesktopApplicationForm key="application-form" initialDraft={restoredApplication} onCancel={() => setScreen({ type: "dashboard" })} onSaveDraft={persistDraft} onReview={values => { setApplicationFormData(values); setSubmitError(""); setScreen({ type: "review" }); }} />
    </PageShell>
  );
  else if (screen.type === "section") content = <SectionForm section={applicationSections.find(item => item.id === screen.sectionId)!} values={applicationFormData[screen.sectionId === "schedule" ? "loan" : screen.sectionId] ?? {}} childAdded={childAdded} childData={childData} businesses={businesses} onFieldChange={(field, value) => { updateSectionData(setApplicationFormData, screen.sectionId, field, value); addToSet(setStartedApplicationSections, startedApplicationSections, screen.sectionId); }} onBack={() => setScreen({ type: "application" })} onDone={() => { addToSet(setCompletedApplicationSections, completedApplicationSections, screen.sectionId); setScreen({ type: "application" }); }} onChild={() => setScreen({ type: "child" })} onBusiness={businessIndex => setScreen({ type: "business", businessIndex })} />;
  else if (screen.type === "child") content = <ChildForm values={childData} onFieldChange={(field, value) => setChildData(current => ({ ...current, [field]: value }))} onBack={() => setScreen({ type: "section", sectionId: "personal" })} onDone={() => { setChildAdded(true); setScreen({ type: "section", sectionId: "personal" }); }} />;
  else if (screen.type === "business") { const businessIndex = screen.businessIndex; content = <BusinessForm number={(businessIndex ?? businesses.length) + 1} values={businessIndex === undefined ? {} : businesses[businessIndex] ?? {}} onBack={() => setScreen({ type: "section", sectionId: "business" })} onRemove={() => { if (businessIndex !== undefined) setBusinesses(current => current.filter((_, index) => index !== businessIndex)); setScreen({ type: "section", sectionId: "business" }); }} onSave={business => { setBusinesses(current => businessIndex === undefined ? [...current, business] : current.map((item, index) => index === businessIndex ? business : item)); addToSet(setStartedApplicationSections, startedApplicationSections, "business"); setScreen({ type: "section", sectionId: "business" }); }} />; }
  else if (screen.type === "review") content = <Review values={applicationFormData} error={submitError} pending={submitting} onBack={() => setScreen({ type: "application" })} onSubmit={submitApplication} />;
  else if (screen.type === "co-maker-view") content = <CoMakerDetailsView loan={screen.loan} onBack={() => setScreen(screen.returnTo === "submission" ? { type: "submission", loan: screen.loan } : { type: "dashboard" })} />;
  else if (screen.type === "co-maker") content = <PageShell title="Add co-maker" desktopTitle="Add co-maker" supportingText="Fill in the co-maker's details for this loan application." back={() => setScreen({ type: "dashboard" })} action={<button onClick={() => setScreen({ type: "dashboard" })} className="text-sm font-semibold text-[#be123c]">Cancel</button>}><div className="lg:hidden"><Checklist coMaker sections={coMakerSections} sectionData={coMakerFormData} completedIds={completedCoMakerSections} startedIds={startedCoMakerSections} error={coMakerError} pending={coMakerSubmitting} onSection={sectionId => setScreen({ type: "co-section", sectionId, loan: screen.loan })} onReview={() => setShowMobileCoMakerConfirmation(true)} /></div><DesktopCoMakerForm loan={screen.loan} onCancel={() => setScreen({ type: "dashboard" })} onSave={form => submitCoMaker(screen.loan, form)} />{showMobileCoMakerConfirmation && <SubmitConfirmationModal title="Add this co-maker?" description={`This will add the co-maker to ${screen.loan.id} — ${screen.loan.name}. The saved co-maker details will be read-only. This cannot be undone.`} confirmLabel="Add co-maker" pending={coMakerSubmitting} onCancel={() => setShowMobileCoMakerConfirmation(false)} onConfirm={() => { setShowMobileCoMakerConfirmation(false); void submitCoMaker(screen.loan, { ...coMakerFormData, __children: encodedRows(Object.keys(coMakerChildData).length ? [coMakerChildData] : []), __businesses: encodedRows(coBorrowerBusinesses) }); }} />}</PageShell>;
  else if (screen.type === "co-section") content = <SectionForm section={coMakerSections.find(item => item.id === screen.sectionId)!} values={coMakerFormData[screen.sectionId] ?? {}} businesses={coBorrowerBusinesses} onFieldChange={(field, value) => { updateSectionData(setCoMakerFormData, screen.sectionId, field, value); addToSet(setStartedCoMakerSections, startedCoMakerSections, screen.sectionId); }} onBack={() => setScreen({ type: "co-maker", loan: screen.loan })} onDone={() => { addToSet(setCompletedCoMakerSections, completedCoMakerSections, screen.sectionId); setScreen({ type: "co-maker", loan: screen.loan }); }} onChild={() => setScreen({ type: "co-child", loan: screen.loan })} onBusiness={businessIndex => setScreen({ type: "co-business-entry", businessIndex, loan: screen.loan })} />;
  else if (screen.type === "co-child") content = <ChildForm values={coMakerChildData} onFieldChange={(field, value) => setCoMakerChildData(current => ({ ...current, [field]: value }))} onBack={() => setScreen({ type: "co-section", sectionId: "co-household", loan: screen.loan })} onDone={() => setScreen({ type: "co-section", sectionId: "co-household", loan: screen.loan })} />;
  else if (screen.type === "co-business-entry") { const businessIndex = screen.businessIndex; const loan = screen.loan; content = <BusinessForm number={(businessIndex ?? coBorrowerBusinesses.length) + 1} values={businessIndex === undefined ? {} : coBorrowerBusinesses[businessIndex] ?? {}} onBack={() => setScreen({ type: "co-section", sectionId: "co-business", loan })} onRemove={() => { if (businessIndex !== undefined) setCoBorrowerBusinesses(current => current.filter((_, index) => index !== businessIndex)); setScreen({ type: "co-section", sectionId: "co-business", loan }); }} onSave={business => { setCoBorrowerBusinesses(current => businessIndex === undefined ? [...current, business] : current.map((item, index) => index === businessIndex ? business : item)); addToSet(setStartedCoMakerSections, startedCoMakerSections, "co-business"); setScreen({ type: "co-section", sectionId: "co-business", loan }); }} />; }
  else content = <SubmissionView loan={screen.loan} coMakerPending={coMakerLoadingLoanId === screen.loan.id} onBack={() => setScreen({ type: "dashboard" })} onCoMaker={() => openCoMaker(screen.loan, "submission")} />;
  return <div className="min-h-screen bg-white text-[#171717]"><DesktopNavigation {...navProps} /><MobileHeader onOpen={() => setMenuOpen(true)} /><MobileNavigation {...navProps} /><div className="lg:pl-[280px]">{coMakerLoadError && <div role="alert" className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-8"><span className="flex-1">{coMakerLoadError}</span><button type="button" onClick={() => setCoMakerLoadError("")} className="font-semibold">Dismiss</button></div>}{content}</div></div>;
}

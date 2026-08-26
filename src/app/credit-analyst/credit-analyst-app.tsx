"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { applicationSections, coMakerSections, documents, FormSection, paymentRows, submissions, Submission, SubmissionStatus } from "./data";
import { DesktopNavigation, MobileHeader, MobileNavigation } from "./navigation";

type Screen =
  | { type: "dashboard" }
  | { type: "application" }
  | { type: "section"; sectionId: string }
  | { type: "child" }
  | { type: "business"; businessIndex?: number }
  | { type: "co-business-entry"; businessIndex?: number; loan: Submission }
  | { type: "review" }
  | { type: "co-maker"; loan: Submission }
  | { type: "co-section"; sectionId: string; loan: Submission }
  | { type: "co-child"; loan: Submission }
  | { type: "submission"; loan: Submission };

type FormDataState = Record<string, Record<string, string>>;

const primaryButton = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]";
const secondaryButton = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#fafafa]";
const inputClass = "h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-base font-normal text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10";

const numericValue = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
const peso = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value).replace("PHP", "₱").trim();
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

function Dashboard({ onNew, onView, onCoMaker }: { onNew: () => void; onView: (loan: Submission) => void; onCoMaker: (loan: Submission) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | SubmissionStatus>("All");
  const [page, setPage] = useState(1);
  const [dateSort, setDateSort] = useState<"asc" | "desc" | null>(null);
  const pageSize = 10;
  const filtered = useMemo(() => submissions.filter(item => (filter === "All" || item.status === filter) && `${item.id} ${item.name}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const sorted = useMemo(() => dateSort ? [...filtered].sort((a, b) => {
    const difference = new Date(a.submitted).getTime() - new Date(b.submitted).getTime();
    return dateSort === "asc" ? difference : -difference;
  }) : filtered, [dateSort, filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  return (
    <main className="min-h-screen bg-white px-4 pb-12 pt-8 lg:px-8">
      <div className="mx-auto max-w-[1096px]">
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
        <div className="hidden lg:grid lg:min-w-[1096px] lg:grid-cols-[1fr_280px_93px_165px] lg:items-center lg:gap-3">
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

        <section className="mt-8 rounded-xl border border-black/10 bg-[#fafafa] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:flex lg:h-[66px] lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#404040]">Unfinished application — Torres, Bea</p>
            <p className="mt-0.5 text-sm text-[#525252]">On this device · last edited today, 2:14 PM · 5 of 8 sections</p>
          </div>
          <div className="mt-3 flex gap-2 lg:mt-0"><button className={`${secondaryButton} hidden lg:inline-flex`}>Discard</button><button onClick={onNew} className="text-sm font-semibold text-[#be123c] lg:rounded-lg lg:bg-[#e11d48] lg:px-4 lg:text-white">Resume</button></div>
        </section>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#737373] lg:hidden">Submitted · {filtered.length}</p>

        <div className="mt-6 hidden overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:block">
          <table className="w-full min-w-[1096px] table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[109px]"/><col className="w-[213px]"/><col className="w-[132px]"/><col className="w-[116px]"/><col className="w-[170px]"/><col className="w-[130px]"/><col className="w-[226px]"/></colgroup>
            <thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Loan ID", "Name", "Amount", "Term", "Date submitted", "Status", "Action"].map(h => <th className="px-6 py-3 font-semibold" key={h}>{h === "Date submitted" ? <button type="button" onClick={() => { setDateSort(current => current === "desc" ? "asc" : "desc"); setPage(1); }} className="inline-flex items-center gap-1 whitespace-nowrap text-left uppercase" aria-label={`Sort by date submitted${dateSort ? ` ${dateSort === "asc" ? "ascending" : "descending"}` : ""}`}>Date submitted <Image className={dateSort === "asc" ? "rotate-180" : ""} src="/credit-analyst/icons/arrow-down.svg" alt="" width={12} height={12} /></button> : h}</th>)}</tr></thead>
            <tbody>{paginated.map(loan => <tr key={loan.id} className="h-[72px] border-t border-[#e5e5e5] text-[#404040]"><td className="whitespace-nowrap px-6">{loan.id}</td><td className="whitespace-nowrap px-6">{loan.name}</td><td className="whitespace-nowrap px-6">{loan.amount}</td><td className="whitespace-nowrap px-6">{loan.term}</td><td className="whitespace-nowrap px-6">{loan.submitted}</td><td className="whitespace-nowrap px-6"><StatusBadge status={loan.status} /></td><td className="px-6"><div className="flex flex-nowrap gap-3"><button onClick={() => onView(loan)} className={`${secondaryButton} h-9 gap-2 px-3`}><Image src="/credit-analyst/icons/eye.svg" alt="" width={20} height={20} />View</button><button onClick={() => onCoMaker(loan)} className={`${secondaryButton} h-9 gap-2 px-3`}><Image src="/credit-analyst/icons/user-plus.svg" alt="" width={20} height={20} />Add</button></div></td></tr>)}</tbody>
          </table>
          <div className="flex h-16 min-w-[1096px] items-center border-t border-[#e5e5e5] px-6 text-sm text-[#404040]"><span>Page {page} of {pageCount}</span><select className="ml-3 h-9 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm"><option>10 per page</option></select><button disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))} className={`${secondaryButton} ml-auto h-9 disabled:cursor-not-allowed disabled:opacity-50`}>Previous</button><button disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))} className={`${secondaryButton} ml-3 h-9 disabled:cursor-not-allowed disabled:opacity-50`}>Next</button></div>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:hidden">
          {filtered.map(loan => <article key={loan.id} className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"><div className="p-3"><div className="flex items-start"><div className="min-w-0 flex-1"><h2 className="font-medium text-[#525252]">{loan.name}</h2><p className="mt-1 text-xs text-[#737373]">{loan.id} · {loan.amount}</p><p className="mt-1 text-xs text-[#737373]">Submitted {loan.submitted}</p></div><StatusBadge status={loan.status} /></div></div><div className="flex gap-4 border-t border-[#e5e5e5] px-4 py-3 text-sm font-semibold text-[#be123c]"><button onClick={() => onView(loan)}>View</button><button disabled={loan.hasCoMaker} onClick={() => onCoMaker(loan)} className="disabled:text-[#f09aac]">{loan.hasCoMaker ? "Co-maker added" : "Add co-maker"}</button></div></article>)}
        </div>
      </div>
    </main>
  );
}

function Checklist({ sections, sectionData = {}, completedIds, startedIds, onSection, onReview, coMaker }: { sections: FormSection[]; sectionData?: FormDataState; completedIds: Set<string>; startedIds: Set<string>; onSection: (id: string) => void; onReview: () => void; coMaker?: boolean }) {
  const completedCount = sections.filter(section => completedIds.has(section.id)).length;
  const progress = completedCount / sections.length;
  return (
    <div className={`mx-auto flex max-w-3xl flex-col px-4 pb-24 lg:px-8 ${coMaker ? "pt-8" : "pt-2"}`}>
      {coMaker && <div className="mb-6 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4"><p className="text-xs font-semibold uppercase text-[#525252]">Loan reference</p><p className="mt-1 text-lg font-medium">LN-0023 · Reyes, Juan</p><p className="mt-1 text-sm text-[#737373]">₱60,000.00 applied · ₱60,000.00 approved</p><p className="mt-1 text-sm text-[#737373]">Released Mar 5, 2026</p></div>}
      <div className="mb-6"><div className="flex text-sm text-[#525252]"><span>{completedCount} of {sections.length} sections complete</span><span className="ml-auto">{Math.round(progress * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5e5e5]"><div className="h-full rounded-full bg-[#e11d48]" style={{ width: `${progress * 100}%` }} /></div></div>
      <div className="flex flex-col gap-3">{sections.map((section, index) => { const complete = completedIds.has(section.id); const inProgress = !complete && startedIds.has(section.id); const enteredValues = Object.values(sectionData[section.id] ?? {}).filter(Boolean); const summary = enteredValues.slice(0, 2).join(" · "); return <button key={section.id} onClick={() => onSection(section.id)} className={`flex min-h-[70px] items-center rounded-xl border bg-white p-4 text-left ${inProgress ? "border-[#f59e0b]" : "border-[#e5e5e5]"}`}><span className={`mr-4 flex size-9 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#dcfce7] text-[#16a34a]" : inProgress ? "bg-[#fef9c3] text-[#ca8a04]" : "bg-[#f5f5f5] text-[#737373]"}`}>{complete ? "✓" : index + 1}</span><span className="min-w-0 flex-1"><span className="block font-medium text-[#525252]">{section.title}</span>{summary && <span className="mt-0.5 block truncate text-sm text-[#737373]">{summary}</span>}</span>{inProgress && <span className="mr-3 rounded-full border border-[#fde047] bg-[#fefce8] px-2 py-1 text-xs text-[#a16207]">In progress</span>}<span className="text-xl text-[#a3a3a3]">›</span></button>; })}</div>
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e5e5e5] bg-white lg:left-[280px]"><div className="mx-auto max-w-3xl px-4 py-4 lg:px-8"><button onClick={onReview} className={`${primaryButton} w-full ${progress < 1 ? "opacity-50" : ""}`}>{coMaker ? "Save co-maker" : "Review & submit"}</button></div></div>
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
  if (section.id === "documents") return <Documents mobileUploadOnly onAddField={onAddField} />;
  if (section.id === "personal") return <div className="flex flex-col gap-6">
    <section><MobileSectionHeading>Name</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Last name", "col-span-2")}{field("First name")}{field("Middle name")}</div></section>
    <section><MobileSectionHeading>Identity</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Date of birth")}{field("Age")}{field("Civil status")}{field("Gender")}{field("Citizenship", "col-span-2")}{field("Place of birth", "col-span-2")}</div></section>
    <section><MobileSectionHeading>Permanent address</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-2">{field("Permanent address", "col-span-2")}{field("Barangay")}{field("City/Town")}{field("ZIP code")}{field("Region")}</div></section>
    <section><MobileSectionHeading>Present address</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-3 text-sm">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option}><input required checked={values["Present address"] === option} onChange={() => onFieldChange("Present address", option)} type="radio" name="mobile-residence" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></section>
    <section><MobileSectionHeading>Contact</MobileSectionHeading><div className="mt-3 grid gap-4">{field("Contact number")}{field("Email / Facebook address")}</div></section>
    <section><MobileSectionHeading>Children</MobileSectionHeading><div className="mt-3">{field("Number of children")}<p className="mt-1 text-xs text-[#737373]">2 rows generated from the count above.</p><div className="mt-3 flex flex-col gap-2">{childAdded && <button type="button" onClick={onChild} className="flex items-center rounded-xl border border-[#e5e5e5] p-3 text-left"><span className="min-w-0 flex-1"><span className="block text-sm">{childData.Name}</span><span className="block truncate text-xs text-[#737373]">{[childData["Grade/Course"], childData.School, childData.Age].filter(Boolean).join(" · ")}</span></span><span>›</span></button>}<button type="button" onClick={onChild} className="rounded-lg border border-dashed border-[#d4d4d4] py-3 text-sm font-medium text-[#737373]">＋ {childAdded ? "Add another child" : "Add child"}</button></div></div></section>
  </div>;
  if (section.id === "business") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Business</MobileSectionHeading><div className="flex flex-col gap-3">{businesses.map((business, index) => <button key={`${business["Business name"]}-${index}`} type="button" onClick={() => onBusiness(index)} className="first:mt-3 flex w-full items-center rounded-xl border border-[#e5e5e5] p-4 text-left"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#525252]">{business["Business name"]}</span><span className="text-xs text-[#737373]">{[business.Type, business.Address, business.Years && `${business.Years} yrs`].filter(Boolean).join(" · ")}</span></span><span className="text-xl text-[#a3a3a3]">›</span></button>)}</div><button type="button" onClick={() => onBusiness()} className="mt-3 w-full rounded-lg border border-dashed border-[#e5e5e5] py-3 text-sm font-semibold text-[#737373]">＋ {businesses.length ? "Add another business" : "Add business"}</button></section><section><MobileSectionHeading>Income</MobileSectionHeading><div className="mt-3">{field("Gross monthly income")}<p className="mt-2 text-sm text-[#525252]">Combined across all businesses listed above.</p></div></section></div>;
  if (section.id === "household") return <div className="flex flex-col gap-6"><section><MobileSectionHeading>Spouse</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Spouse name", "col-span-2")}{field("Occupation")}{field("Age")}</div></section><section><MobileSectionHeading>Employment</MobileSectionHeading><div className="mt-3 grid grid-cols-2 gap-4">{field("Company", "col-span-2")}{field("Years")}{field("Monthly income/salary")}</div></section></div>;
  if (section.id === "other") return <div>{field("Real and personal properties owned")}<fieldset className="mt-6"><legend className="text-xs font-semibold uppercase text-[#525252]">Health declaration</legend><div className="mt-3 flex flex-col gap-3 text-sm">{["In good health", "Has pre-existing illness"].map(option => <label key={option}><input required checked={values["Health declaration"] === option} onChange={() => onFieldChange("Health declaration", option)} type="radio" name="mobile-health" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset></div>;
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

function Documents({ onAddField }: { onAddField: () => void; mobileUploadOnly?: boolean }) {
  const [files, setFiles] = useState<{ name: string; size: string; progress: number }[]>([]);
  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextFiles = Array.from(selectedFiles).filter(file => file.size <= 5 * 1024 * 1024).map(file => ({ name: file.name, size: file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`, progress: 100 }));
    setFiles(current => [...current, ...nextFiles]);
  };
  return <div><label className="flex min-h-[126px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e5e5] text-center"><span className="flex size-10 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_-2px_0_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.08)]"><Image src="/credit-analyst/icons/camera.svg" alt="" width={20} height={20} /></span><span className="mt-3 text-sm leading-5 text-[#525252]"><strong className="font-semibold text-[#be123c]">Click to upload</strong> or take a photo</span><span className="mt-1 text-xs leading-[18px] text-[#525252]">PNG, JPG (max. 5MB)</span><input type="file" accept="image/png,image/jpeg,application/pdf" multiple onChange={event => { addFiles(event.target.files); event.target.value = ""; }} className="sr-only" /></label><div className="mt-4 grid gap-3">{files.map((file, index) => <div key={`${file.name}-${index}`} className="relative flex min-h-[72px] items-start overflow-hidden rounded-xl border border-[#e5e5e5] p-4"><span aria-hidden className="absolute inset-y-0 left-0 hidden bg-[#fafafa] lg:block" style={{ width: file.progress === 100 ? "0" : `${50 + file.progress / 2}%` }} /><div className="relative flex min-w-0 flex-1 items-start gap-2"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} className="shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-5 text-[#404040]">{file.name}</p><div className="mt-0.5 flex items-center gap-2 text-sm leading-5 text-[#525252]"><span>{file.size}</span><span className="h-3 w-px bg-[#d4d4d4]" /><Image src={file.progress === 100 ? "/credit-analyst/icons/check-circle.svg" : "/credit-analyst/icons/upload-cloud.svg"} alt="" width={16} height={16} /><span>{file.progress}%</span></div></div></div><button type="button" onClick={() => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="relative -mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md"><Image src="/credit-analyst/icons/trash.svg" alt="" width={16} height={16} /></button></div>)}</div><button type="button" onClick={onAddField} className="mt-6 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:w-auto lg:border-solid"><Image src="/credit-analyst/icons/plus.svg" alt="" width={20} height={20} />Add Field</button></div>;
}

function DesktopApplicationForm({ onCancel, onReview }: { onCancel: () => void; onReview: () => void }) {
  const [showAddField, setShowAddField] = useState(false);
  const [schedulePage, setSchedulePage] = useState(1);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [childrenCount, setChildrenCount] = useState("2");
  const [desktopChildren, setDesktopChildren] = useState<Record<string, string>[]>(() => Array.from({ length: 2 }, () => ({})));
  const [desktopBusinesses, setDesktopBusinesses] = useState<Record<string, string>[]>([{}]);
  const [customFields, setCustomFields] = useState<number[]>([]);
  const generatedPayments = generatePaymentSchedule(loanAmount, loanTerm);
  const schedulePageCount = Math.max(1, Math.ceil(generatedPayments.length / 10));
  const changeChildrenCount = (value: string) => {
    const count = Math.min(20, Math.max(0, Math.floor(numericValue(value))));
    setChildrenCount(value);
    setDesktopChildren(current => Array.from({ length: count }, (_, index) => current[index] ?? {}));
  };
  const updateChild = (row: number, field: string, value: string) => setDesktopChildren(current => current.map((child, index) => index === row ? { ...child, [field]: value, ...(field === "Birthday" ? { Age: calculateAge(value) } : {}) } : child));
  const updateBusiness = (row: number, field: string, value: string) => setDesktopBusinesses(current => current.map((business, index) => index === row ? { ...business, [field]: value } : business));

  return (
    <form onSubmit={(event) => { event.preventDefault(); onReview(); }} className="hidden px-8 pb-8 lg:block">
      <div className="mx-auto max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white px-6 pt-6">
        {applicationSections.filter(section => section.id !== "schedule").map(section => (
          <section key={section.id} className="mb-8">
            <h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase tracking-wide text-[#525252]">{section.title}</h2>
            <div className="mt-6">
              {section.id === "documents" ? (
                <><Documents onAddField={() => setShowAddField(true)} />{customFields.map((fieldId, index) => <div key={fieldId} className="mt-6 flex items-end gap-3"><div className="flex-1"><FormField label={`Additional field ${index + 1}`} textarea /></div><button type="button" onClick={() => setCustomFields(current => current.filter(id => id !== fieldId))} className="mb-2 flex size-8 items-center justify-center rounded-md hover:bg-[#fafafa]" aria-label={`Delete additional field ${index + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></div>)}</>
              ) : (
                <div className={`grid gap-x-6 gap-y-6 ${section.id === "personal" ? "grid-cols-12" : section.id === "business" || section.id === "relative" ? "grid-cols-2" : "grid-cols-3"}`}>
                  {section.fields?.filter(field => section.id !== "business" && !(section.id === "personal" && ["Contact number", "Email / Facebook address"].includes(field))).map(field => (
                    <div key={field} className={section.id === "personal" ? field === "Permanent address" ? "col-span-12" : ["Barangay", "City/Town", "ZIP code", "Region"].includes(field) ? "col-span-3" : ["Contact number", "Email / Facebook address"].includes(field) ? "col-span-6" : "col-span-4" : section.id === "relative" && field === "Address" ? "col-span-2" : section.id === "other" ? "col-span-3" : ""}>
                      <FormField label={field} textarea={field.toLowerCase().includes("properties")} value={section.id === "loan" && field === "Loan amount" ? loanAmount : section.id === "loan" && field === "Term" ? loanTerm : undefined} onValueChange={section.id === "loan" && field === "Loan amount" ? value => { setLoanAmount(value); setSchedulePage(1); } : section.id === "loan" && field === "Term" ? value => { setLoanTerm(value); setSchedulePage(1); } : undefined} />
                    </div>
                  ))}
                </div>
              )}
              {section.id === "personal" && <><div className="mt-6 grid grid-cols-2 gap-6"><fieldset><legend className="text-xs font-semibold uppercase text-[#525252]">Present address</legend><div className="mt-3 grid grid-cols-2 gap-3 text-sm">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option}><input required defaultChecked={option === "Rented"} type="radio" name="residence" className="mr-2 accent-[#e11d48]" />{option}</label>)}</div></fieldset><FormField label="Number of children" value={childrenCount} onValueChange={changeChildrenCount} /></div><div className="mt-6 grid grid-cols-2 gap-6"><FormField label="Contact number" /><FormField label="Email / Facebook address" /></div><div className="mt-6"><div className="mb-3 flex items-center"><h3 className="text-xs font-semibold uppercase text-[#525252]">Children</h3><span className="ml-auto text-xs text-[#737373]">{desktopChildren.length} {desktopChildren.length === 1 ? "row" : "rows"} generated from the count above</span></div>{desktopChildren.length > 0 && <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Name", "School", "Grade/Course", "Birthday", "Age", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{desktopChildren.map((child, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Name", "School", "Grade/Course", "Birthday", "Age"].map((field, index) => <td key={field} className="px-6"><input type={field === "Birthday" ? "date" : "text"} max={field === "Birthday" ? new Date().toISOString().slice(0, 10) : undefined} readOnly={field === "Age"} value={child[field] ?? ""} onChange={event => updateChild(row, field, event.target.value)} className={`${inputClass} h-9 px-3 text-sm ${field === "Age" ? "bg-[#fafafa]" : ""}`} placeholder={field === "Birthday" ? undefined : ["Full name", "School name", "Grade or course", "", "Age"][index]} /></td>)}<td className="px-4"><button type="button" onClick={() => { setDesktopChildren(current => current.filter((_, index) => index !== row)); setChildrenCount(String(Math.max(0, desktopChildren.length - 1))); }} className="flex size-7 items-center justify-center" aria-label={`Remove child ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></td></tr>)}</tbody></table></div>}<button type="button" onClick={() => { setDesktopChildren(current => [...current, {}]); setChildrenCount(String(desktopChildren.length + 1)); }} className={`${secondaryButton} mt-3 gap-2`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add another child</button></div></>}
              {section.id === "business" && <div>{desktopBusinesses.length > 0 && <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Business name", "Type", "Address", "Years", ""].map((label, index) => <th key={`${label}-${index}`} className="px-6">{label}</th>)}</tr></thead><tbody>{desktopBusinesses.map((business, row) => <tr key={row} className="h-[72px] border-t border-[#e5e5e5]">{["Business name", "Type", "Address", "Years"].map(field => <td key={field} className="px-6"><input value={business[field] ?? ""} onChange={event => updateBusiness(row, field, event.target.value)} className={`${inputClass} h-9 px-3 text-sm`} placeholder={field} /></td>)}<td className="px-4"><button type="button" onClick={() => setDesktopBusinesses(current => current.filter((_, index) => index !== row))} className="flex size-7 items-center justify-center" aria-label={`Remove business ${row + 1}`}><Image src="/credit-analyst/icons/trash.svg" alt="" width={20} height={20} /></button></td></tr>)}</tbody></table></div>}<button type="button" onClick={() => setDesktopBusinesses(current => [...current, {}])} className={`${secondaryButton} mt-3 gap-2`}><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add another business</button><div className="mt-6 max-w-[512px]"><FormField label="Gross monthly income" /></div></div>}
              {section.id === "other" && <div className="mt-6 flex flex-col gap-6">{["Health declaration", "Health declaration"].map((label, index) => <fieldset key={index}><legend className="text-xs font-semibold uppercase text-[#525252]">{label}</legend><div className="mt-3 flex gap-8 text-sm"><label><input required defaultChecked type="radio" name={`health-${index}`} className="mr-2 accent-[#e11d48]" />In good health</label><label><input required type="radio" name={`health-${index}`} className="mr-2 accent-[#e11d48]" />Has pre-existing illness</label></div></fieldset>)}</div>}
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
          <button type="button" className={secondaryButton}>Save draft</button>
          <button type="submit" className={primaryButton}>Submit Application</button>
        </div>
      </div>
      {showAddField && <Modal title="Add field" onClose={() => setShowAddField(false)}><p className="mb-4 text-sm text-[#525252]">Choose what you&apos;d like to add to this application.</p><button type="button" onClick={() => { setCustomFields(current => [...current, Date.now()]); setShowAddField(false); }} className="w-full rounded-xl border border-[#d4d4d4] p-4 text-left text-sm"><strong className="block">Text area</strong><span className="mt-1 block text-[#525252]">Add a note or remark about this submission</span></button></Modal>}
    </form>
  );
}

function DesktopCoMakerForm({ loan, onCancel, onSave }: { loan: Submission; onCancel: () => void; onSave: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [childrenCount, setChildrenCount] = useState("2");
  const [children, setChildren] = useState<Record<string, string>[]>([{}, {}]);
  const [businesses, setBusinesses] = useState<Record<string, string>[]>([{}, {}]);
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
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="hidden px-8 pb-8 pt-8 lg:block">
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
            {field("Age")}{field("Civil status")}{field("Date of birth")}
            {field("Citizenship")}{field("Gender")}{field("Place of birth")}
            {field("Contact number")}{field("Email / Facebook address")}{field("Relationship to borrower")}
            {field("Home address", "col-span-3")}
          </div>
          <div className="mt-6 grid grid-cols-4 gap-6">{field("Home barangay")}{field("Home city/town")}{field("Home ZIP code")}{field("Home region")}</div>
          <div className="mt-6">{field("Provincial address")}</div>
          <div className="mt-6 grid grid-cols-4 gap-6">{field("Provincial barangay")}{field("Provincial city/town")}{field("Provincial ZIP code")}{field("Provincial region")}</div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <fieldset><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">Present address</legend><div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2 text-sm leading-5 text-[#404040]">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option} className="flex items-center gap-2"><input required type="radio" name="co-residence" className="size-4 accent-[#e11d48]" />{option}</label>)}</div></fieldset>
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
          <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
          <button type="button" className={secondaryButton}>Save draft</button>
          <button type="submit" className={primaryButton}>Save co-borrower</button>
        </div>
      </div>
    </form>
  );
}

function PaymentSchedule({ loanValues, onBack, onDone }: { loanValues: Record<string, string>; onBack: () => void; onDone: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const rows = generatePaymentSchedule(loanValues["Loan amount"] ?? "", loanValues.Term ?? "");
  const total = numericValue(loanValues["Loan amount"] ?? "");
  return <PageShell title="Payment schedule" back={onBack} action={<button onClick={onDone} className="text-sm font-semibold text-[#be123c]">Done</button>}><div className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:px-8">{rows.length ? <><div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4"><p className="text-xs font-semibold uppercase text-[#525252]">Per payment</p><p className="mt-1 text-2xl font-semibold">{rows[0].amount}</p><p className="mt-1 text-sm text-[#737373]">{rows.length} payments · daily · {peso(total)} total</p></div><dl className="mt-5 text-sm"><div className="flex border-b border-[#e5e5e5] py-3"><dt className="text-[#737373]">First due</dt><dd className="ml-auto font-medium">{rows[0].date}</dd></div><div className="flex py-3"><dt className="text-[#737373]">Final due</dt><dd className="ml-auto font-medium">{rows[rows.length - 1].date}</dd></div></dl><h2 className="mt-5 text-xs font-semibold uppercase text-[#525252]">All payments</h2><div className="mt-2">{rows.slice(0, showAll ? rows.length : 6).map(row => <div className="flex border-b border-[#e5e5e5] py-3 text-sm" key={row.number}><span className="text-[#737373]">{row.number} · {row.date}</span><strong className="ml-auto">{row.amount}</strong></div>)}</div>{rows.length > 6 && <button type="button" onClick={() => setShowAll(current => !current)} className="mt-4 text-sm font-semibold text-[#be123c]">{showAll ? "Show fewer payments" : `Show all ${rows.length} payments`}</button>}</> : <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm text-[#525252]">Enter the loan amount and term first to generate a payment schedule.</div>}<button onClick={onDone} className={`${primaryButton} mt-8 w-full`}>Done</button></div></PageShell>;
}

function Review({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const sections = [{ title: "Personal information", rows: [["Name", "Dela Cruz, Ana Reyes"], ["Date of birth", "12 Mar 1988"], ["Children", "2"]] }, { title: "Business & household", rows: [["Gross monthly", "₱42,000.00"], ["Spouse income", "₱18,000.00"]] }, { title: "Loan details", rows: [["Product", "Daily"], ["Amount", "₱60,000.00"], ["Term", "60 days"]] }, { title: "Documents", rows: [["Uploaded", "3 files"]] }];
  return <PageShell title="Review & submit" back={onBack}><div className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:px-8"><p className="text-sm leading-6 text-[#525252]">Check the details with your client before submitting. You can’t edit after submission.</p>{sections.map(section => <section key={section.title} className="mt-5"><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#525252]">{section.title}</h2><dl className="mt-2">{section.rows.map(([label,value]) => <div key={label} className="flex py-2 text-sm"><dt className="text-[#737373]">{label}</dt><dd className="ml-auto font-medium">{value}</dd></div>)}</dl><button className="text-sm font-semibold text-[#be123c]">Edit</button></section>)}<button onClick={onSubmit} className={`${primaryButton} mt-7 w-full`}>Forward application</button></div></PageShell>;
}

function ReadOnlyField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={className}><p className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</p><div className="mt-1.5 flex h-10 items-center rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 text-base text-[#525252] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">{value}</div></div>;
}

function ReadOnlySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase leading-5 text-[#404040]">{title}</h2><div className="mt-6">{children}</div></section>;
}

function DesktopSubmissionView({ loan, onBack }: { loan: Submission; onBack: () => void }) {
  const [schedulePage, setSchedulePage] = useState(1);
  const rows = paymentRows.slice((schedulePage - 1) * 10, schedulePage * 10);
  return <main className="min-h-screen bg-white px-8 pb-12 pt-8">
    <header className="mx-auto max-w-[1096px]">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} />Back to my submissions</button>
      <div className="mt-4 flex items-center gap-2"><h1 className="text-xl font-semibold leading-[30px] text-[#171717]">{loan.id} — {loan.name}</h1><StatusBadge status={loan.status} /></div>
      <p className="text-base leading-6 text-[#525252]">Submitted Mar 5, 2026 · Read-only — submitted applications cannot be edited.</p>
    </header>
    <div className="mx-auto mt-8 max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white p-6">
      <div className="space-y-8">
        <ReadOnlySection title="Personal information"><div className="grid grid-cols-3 gap-x-6 gap-y-6">
          <ReadOnlyField label="Last name" value="Reyes" /><ReadOnlyField label="First name" value="Juan" /><ReadOnlyField label="Middle name" value="Santos" />
          <ReadOnlyField label="Age" value="34" /><ReadOnlyField label="Civil status" value="Married" /><ReadOnlyField label="Date of birth" value="04 / 12 / 1991" />
          <ReadOnlyField label="Citizenship" value="Filipino" /><ReadOnlyField label="Gender" value="Male" /><ReadOnlyField label="Place of birth" value="Caloocan City, Metro Manila" />
          <ReadOnlyField label="Permanent address" value="42 Samson Road, Caloocan City" className="col-span-3" />
          <ReadOnlyField label="Barangay" value="Barangay 174" /><ReadOnlyField label="City/Town" value="Caloocan City" /><div className="grid grid-cols-2 gap-6"><ReadOnlyField label="ZIP code" value="1422" /><ReadOnlyField label="Region" value="NCR" /></div>
          <fieldset className="col-span-2"><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">Present address</legend><div className="mt-1.5 grid grid-cols-2 gap-y-2 text-sm text-[#525252]">{["Rented", "Living with parents", "Owned", "Mortgaged", "Others"].map(option => <label key={option} className="flex items-center gap-2"><input type="radio" checked={option === "Rented"} readOnly className="accent-[#e11d48]" />{option}</label>)}</div></fieldset>
          <ReadOnlyField label="Number of children" value="1" />
          <ReadOnlyField label="Contact number" value="0917 123 4567" /><ReadOnlyField label="Email / Facebook address" value="URL    juan.reyes@email.com" className="col-span-2" />
          <div className="col-span-3"><p className="mb-3 text-xs font-semibold uppercase leading-[18px] text-[#404040]">Children</p><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="px-6">Name</th><th className="px-6">School</th><th className="px-6">Grade/Course</th><th className="px-6">Birthday</th><th className="w-[118px] px-6">Age</th></tr></thead><tbody><tr className="h-[72px] border-t border-[#e5e5e5] text-[#404040]"><td className="px-6">Reyes, Ella</td><td className="px-6">Caloocan North Elementary</td><td className="px-6">Grade 2</td><td className="px-6">01/12/2019</td><td className="px-6">7</td></tr></tbody></table></div></div>
        </div></ReadOnlySection>
        <ReadOnlySection title="Business information"><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="w-[35%] px-6">Business name</th><th className="w-[18%] px-6">Type</th><th className="px-6">Address</th><th className="w-[15%] px-6">Years</th></tr></thead><tbody><tr className="h-[72px] border-t border-[#e5e5e5]"><td className="px-6">Reyes Hardware Supply</td><td className="px-6">Retail</td><td className="px-6">Caloocan City</td><td className="px-6">7</td></tr></tbody></table></div><ReadOnlyField label="Gross monthly income" value="PHP 45,000.00" className="mt-6 w-[512px]" /></ReadOnlySection>
        <ReadOnlySection title="Household information"><div className="grid grid-cols-3 gap-x-6 gap-y-6"><ReadOnlyField label="Spouse name" value="Reyes, Liza" /><ReadOnlyField label="Occupation" value="Teacher" /><ReadOnlyField label="Age" value="32" /><ReadOnlyField label="Company" value="Caloocan North National HS" /><ReadOnlyField label="Years" value="6" /><ReadOnlyField label="Monthly income/salary" value="PHP 22,000.00" /></div></ReadOnlySection>
        <ReadOnlySection title="Other information"><ReadOnlyField label="Real and personal properties owned" value="None declared" className="[&>div]:h-[126px] [&>div]:items-start [&>div]:pt-3" /><fieldset className="mt-6"><legend className="text-xs font-semibold uppercase text-[#404040]">Health declaration</legend><div className="mt-2 flex gap-8 text-sm text-[#525252]"><label className="flex items-center gap-2"><input type="radio" checked readOnly className="accent-[#e11d48]" />In good health</label><label className="flex items-center gap-2"><input type="radio" readOnly />Has pre-existing illness</label></div></fieldset></ReadOnlySection>
        <ReadOnlySection title="Nearest relative to contact"><div className="grid grid-cols-2 gap-6"><ReadOnlyField label="Name" value="Reyes, Carlos" /><ReadOnlyField label="Contact number" value="0918 555 2211" /><ReadOnlyField label="Address" value="Caloocan City, Metro Manila" className="col-span-2" /></div></ReadOnlySection>
        <ReadOnlySection title="Loan details"><div className="grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value="PHP 60,000 / 60 days" /><ReadOnlyField label="Loan amount" value="PHP 60,000" /><ReadOnlyField label="Term" value="60 Days" /></div></ReadOnlySection>
        <ReadOnlySection title="Supporting documents"><div className="space-y-3">{documents.map(file => <div key={file.name} className="flex h-[70px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium text-[#404040]">{file.name}</p><p className="text-xs text-[#737373]">{file.meta.split(" · ")[0]} · Uploaded Mar 5, 2026</p></div></div>)}</div></ReadOnlySection>
        <ReadOnlySection title="Projected payment schedule"><div className="overflow-hidden rounded-lg border border-[#e5e5e5]"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[120px]" /><col /><col /></colgroup><thead className="h-11 bg-[#fafafa] text-xs font-semibold uppercase text-[#737373]"><tr><th className="px-6">Payment no.</th><th className="px-6">Due date</th><th className="px-6">Amount</th></tr></thead><tbody>{rows.map(row => <tr key={row.number} className="h-[72px] border-t border-[#e5e5e5] font-medium"><td className="px-6">{row.number}</td><td className="px-6">{row.date}</td><td className="px-6">{row.amount}</td></tr>)}</tbody></table><div className="flex h-16 items-center border-t border-[#e5e5e5] px-6 text-sm"><span>Page {schedulePage} of 6</span><select className="ml-3 h-9 w-32 rounded-lg border border-[#d4d4d4] px-3"><option>10 per page</option></select><button type="button" disabled={schedulePage === 1} onClick={() => setSchedulePage(page => page - 1)} className={`${secondaryButton} ml-auto disabled:opacity-50`}>Previous</button><button type="button" disabled={schedulePage === 6} onClick={() => setSchedulePage(page => page + 1)} className={`${secondaryButton} ml-3 disabled:opacity-50`}>Next</button></div></div></ReadOnlySection>
      </div>
      <div className="-mx-6 -mb-6 mt-6 flex h-[69px] items-center justify-end border-t border-[#e5e5e5] px-6"><button onClick={onBack} className={secondaryButton}>Back to my submissions</button></div>
    </div>
  </main>;
}

function SubmissionView({ loan, onBack, onCoMaker }: { loan: Submission; onBack: () => void; onCoMaker: () => void }) {
  const [expanded, setExpanded] = useState(loan.hasCoMaker ? "documents" : "personal");
  const [showMobilePayments, setShowMobilePayments] = useState(false);
  const sections = [
    { id: "personal", title: "Personal information", summary: `${loan.name} · 1 child`, rows: [["Name", "Reyes, Juan Santos"], ["Age / Civil status", "34 · Married"], ["Date of birth", "04/12/1991"], ["Citizenship / Gender", "Filipino · Male"], ["Place of birth", "Caloocan City"], ["Permanent address", "42 Samson Road, Caloocan"], ["Barangay / Zip", "174 · 1422 · NCR"], ["Present address", "Rented"], ["Contact", "0917 123 4567"], ["Email", "juan.reyes@email.com"], ["Children", "1"]] },
    { id: "business", title: "Business information", summary: "Reyes Hardware Supply · ₱45,000/mo", rows: [["Business", "Reyes Hardware Supply"], ["Type", "Retail"], ["Gross monthly income", "₱45,000.00"]] },
    { id: "household", title: "Household information", summary: "Reyes, Liza · Teacher · ₱22,000/mo", rows: [["Spouse", "Reyes, Liza"], ["Occupation", "Teacher"], ["Monthly income", "₱22,000.00"]] },
    { id: "other", title: "Other information", summary: "None declared · In good health", rows: [["Properties", "None declared"], ["Health declaration", "In good health"]] },
    { id: "relative", title: "Nearest relative", summary: "Reyes, Carlos · 0918 555 2211", rows: [["Name", "Reyes, Carlos"], ["Contact", "0918 555 2211"], ["Address", "Caloocan City"]] },
    { id: "loan", title: "Loan details", summary: `${loan.amount} · ${loan.term}`, rows: [["Product", "Daily"], ["Amount", loan.amount], ["Term", loan.term]] },
    { id: "documents", title: "Supporting documents", summary: "3 files", rows: [] },
    { id: "schedule", title: "Payment schedule", summary: `60 × ₱1,000.00`, rows: [] },
  ];
  return <><div className="hidden lg:block"><DesktopSubmissionView loan={loan} onBack={onBack} /></div><div className="lg:hidden"><PageShell title={loan.id} back={onBack} action={<StatusBadge status={loan.status} />}>
    <div className="mx-auto w-full max-w-[1096px] px-4 pb-24 pt-6">
      <div className="mb-4 lg:hidden"><h2 className="text-lg font-semibold text-[#171717]">{loan.name}</h2><p className="text-xs text-[#737373]">{loan.amount} · Daily · {loan.term}</p></div>
      <p className="rounded-lg bg-[#f5f5f5] px-3 py-2.5 text-xs leading-[18px] text-[#737373]">Submitted {loan.submitted} · Read-only — submitted applications cannot be edited.</p>
      <div className="mt-4 lg:mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:p-6">
        {sections.map(section => <section key={section.id} className="border-b border-[#e5e5e5] py-3 lg:mb-8 lg:border-0 lg:py-0"><button type="button" onClick={() => setExpanded(current => current === section.id ? "" : section.id)} className="flex w-full items-center text-left lg:pointer-events-none"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold uppercase text-[#404040]">{section.title}</span><span className="block truncate text-xs text-[#737373] lg:hidden">{section.summary}</span></span><span className="text-base text-[#737373] lg:hidden">{expanded === section.id ? "−" : "+"}</span></button>
          <div className={`${expanded === section.id ? "block" : "hidden"} lg:block`}>
            {section.rows.length > 0 && <dl className="mt-3 grid gap-x-6 lg:grid-cols-3">{section.rows.map(([label, value]) => <div key={label} className="flex justify-between py-1.5 lg:block lg:py-3"><dt className="text-xs text-[#737373] lg:font-semibold lg:uppercase">{label}</dt><dd className="text-right text-sm font-medium text-[#171717] lg:mt-1 lg:text-left lg:text-base">{value}</dd></div>)}</dl>}
            {section.id === "documents" && <div className="mt-3 grid gap-2 lg:grid-cols-3">{documents.map(file => <div key={file.name} className="rounded-xl border border-[#e5e5e5] p-3"><p className="text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-[#737373]">{file.meta.split(" · ")[0]} · Uploaded Nov 18, 2025</p></div>)}</div>}
            {section.id === "schedule" && <div className="mt-3"><p className="text-[10px] font-semibold uppercase leading-[14px] text-[#737373]">Per payment</p><p className="text-2xl font-semibold leading-[30px]">₱1,000.00</p><p className="text-xs leading-[18px] text-[#737373]">60 payments · daily · {loan.amount} total</p><div className="mt-3 flex py-1.5 text-xs"><span className="text-[#737373]">First due</span><span className="ml-auto text-sm font-medium text-[#171717]">Jun 24, 2026</span></div><div className="flex py-1.5 text-xs"><span className="text-[#737373]">Final due</span><span className="ml-auto text-sm font-medium text-[#171717]">Aug 22, 2026</span></div><button type="button" onClick={() => setShowMobilePayments(current => !current)} className="mt-3 text-sm font-semibold leading-5 text-[#be123c]">{showMobilePayments ? "Hide payments" : "Show all 60 payments"}</button>{showMobilePayments && <div className="mt-3 overflow-hidden rounded-lg border border-[#e5e5e5]">{paymentRows.map(row => <div key={row.number} className="flex min-h-12 items-center border-b border-[#e5e5e5] px-3 py-2 text-sm last:border-b-0"><span className="w-9 shrink-0 text-xs font-semibold text-[#737373]">{row.number}</span><span className="text-[#525252]">{row.date}</span><span className="ml-auto font-medium text-[#171717]">{row.amount}</span></div>)}</div>}</div>}
          </div>
        </section>)}
      </div>
      <button onClick={onCoMaker} disabled={loan.hasCoMaker} className={`${secondaryButton} mt-6 w-full disabled:text-[#a3a3a3]`}>{loan.hasCoMaker ? "Co-maker already added" : "Add co-maker"}</button>
    </div>
  </PageShell></div></>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-1 flex items-center"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} className="ml-auto text-2xl text-[#a3a3a3]">×</button></div>{children}</div></div>;
}

export default function CreditAnalystApp() {
  const [screen, setScreen] = useState<Screen>({ type: "dashboard" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [completedApplicationSections, setCompletedApplicationSections] = useState<Set<string>>(new Set());
  const [startedApplicationSections, setStartedApplicationSections] = useState<Set<string>>(new Set());
  const [completedCoMakerSections, setCompletedCoMakerSections] = useState<Set<string>>(new Set());
  const [startedCoMakerSections, setStartedCoMakerSections] = useState<Set<string>>(new Set());
  const [applicationFormData, setApplicationFormData] = useState<FormDataState>({});
  const [coMakerFormData, setCoMakerFormData] = useState<FormDataState>({});
  const [childData, setChildData] = useState<Record<string, string>>({});
  const [childAdded, setChildAdded] = useState(false);
  const [businesses, setBusinesses] = useState<Record<string, string>[]>([]);
  const [coBorrowerBusinesses, setCoBorrowerBusinesses] = useState<Record<string, string>[]>([]);
  const addToSet = (setter: (value: Set<string>) => void, current: Set<string>, id: string) => setter(new Set(current).add(id));
  const updateSectionData = (setter: (updater: (current: FormDataState) => FormDataState) => void, sectionId: string, field: string, value: string) => setter(current => ({ ...current, [sectionId]: { ...current[sectionId], [field]: value } }));
  const active = screen.type === "dashboard" || screen.type === "submission" ? "submissions" : "application";
  const navigate = (target: "submissions" | "application") => { setScreen(target === "submissions" ? { type: "dashboard" } : { type: "application" }); setMenuOpen(false); };
  const navProps = { active, mobileOpen: menuOpen, onClose: () => setMenuOpen(false), onNavigate: navigate } as const;
  let content: ReactNode;
  if (screen.type === "dashboard") content = <Dashboard onNew={() => setScreen({ type: "application" })} onView={loan => setScreen({ type: "submission", loan })} onCoMaker={loan => setScreen({ type: "co-maker", loan })} />;
  else if (screen.type === "application") content = (
    <PageShell title="Reyes, Juan" desktopTitle="New loan application" supportingText="Fill in the client's details and submit for review." back={() => setScreen({ type: "dashboard" })} action={<button onClick={() => setScreen({ type: "dashboard" })} className="text-sm font-semibold text-[#be123c]">Discard</button>}>
      <div className="lg:hidden">
        <div className="px-4 pt-8"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-[#525252]">Not yet submitted · Saved on this device</p></div></div>
        <Checklist sections={applicationSections} sectionData={applicationFormData} completedIds={completedApplicationSections} startedIds={startedApplicationSections} onSection={sectionId => setScreen({ type: "section", sectionId })} onReview={() => setScreen({ type: "review" })} />
      </div>
      <DesktopApplicationForm onCancel={() => setScreen({ type: "dashboard" })} onReview={() => setScreen({ type: "review" })} />
    </PageShell>
  );
  else if (screen.type === "section") content = <SectionForm section={applicationSections.find(item => item.id === screen.sectionId)!} values={applicationFormData[screen.sectionId === "schedule" ? "loan" : screen.sectionId] ?? {}} childAdded={childAdded} childData={childData} businesses={businesses} onFieldChange={(field, value) => { updateSectionData(setApplicationFormData, screen.sectionId, field, value); addToSet(setStartedApplicationSections, startedApplicationSections, screen.sectionId); }} onBack={() => setScreen({ type: "application" })} onDone={() => { addToSet(setCompletedApplicationSections, completedApplicationSections, screen.sectionId); setScreen({ type: "application" }); }} onChild={() => setScreen({ type: "child" })} onBusiness={businessIndex => setScreen({ type: "business", businessIndex })} />;
  else if (screen.type === "child") content = <ChildForm values={childData} onFieldChange={(field, value) => setChildData(current => ({ ...current, [field]: value }))} onBack={() => setScreen({ type: "section", sectionId: "personal" })} onDone={() => { setChildAdded(true); setScreen({ type: "section", sectionId: "personal" }); }} />;
  else if (screen.type === "business") { const businessIndex = screen.businessIndex; content = <BusinessForm number={(businessIndex ?? businesses.length) + 1} values={businessIndex === undefined ? {} : businesses[businessIndex] ?? {}} onBack={() => setScreen({ type: "section", sectionId: "business" })} onRemove={() => { if (businessIndex !== undefined) setBusinesses(current => current.filter((_, index) => index !== businessIndex)); setScreen({ type: "section", sectionId: "business" }); }} onSave={business => { setBusinesses(current => businessIndex === undefined ? [...current, business] : current.map((item, index) => index === businessIndex ? business : item)); addToSet(setStartedApplicationSections, startedApplicationSections, "business"); setScreen({ type: "section", sectionId: "business" }); }} />; }
  else if (screen.type === "review") content = <Review onBack={() => setScreen({ type: "application" })} onSubmit={() => setScreen({ type: "dashboard" })} />;
  else if (screen.type === "co-maker") content = <PageShell title="Add co-maker" desktopTitle="Add co-maker" supportingText="Fill in the co-maker's details for this loan application." back={() => setScreen({ type: "dashboard" })} action={<button onClick={() => setScreen({ type: "dashboard" })} className="text-sm font-semibold text-[#be123c]">Cancel</button>}><div className="lg:hidden"><Checklist coMaker sections={coMakerSections} sectionData={coMakerFormData} completedIds={completedCoMakerSections} startedIds={startedCoMakerSections} onSection={sectionId => setScreen({ type: "co-section", sectionId, loan: screen.loan })} onReview={() => setScreen({ type: "submission", loan: screen.loan })} /></div><DesktopCoMakerForm loan={screen.loan} onCancel={() => setScreen({ type: "dashboard" })} onSave={() => setScreen({ type: "submission", loan: screen.loan })} /></PageShell>;
  else if (screen.type === "co-section") content = <SectionForm section={coMakerSections.find(item => item.id === screen.sectionId)!} values={coMakerFormData[screen.sectionId] ?? {}} businesses={coBorrowerBusinesses} onFieldChange={(field, value) => { updateSectionData(setCoMakerFormData, screen.sectionId, field, value); addToSet(setStartedCoMakerSections, startedCoMakerSections, screen.sectionId); }} onBack={() => setScreen({ type: "co-maker", loan: screen.loan })} onDone={() => { addToSet(setCompletedCoMakerSections, completedCoMakerSections, screen.sectionId); setScreen({ type: "co-maker", loan: screen.loan }); }} onChild={() => setScreen({ type: "co-child", loan: screen.loan })} onBusiness={businessIndex => setScreen({ type: "co-business-entry", businessIndex, loan: screen.loan })} />;
  else if (screen.type === "co-child") content = <ChildForm values={childData} onFieldChange={(field, value) => setChildData(current => ({ ...current, [field]: value }))} onBack={() => setScreen({ type: "co-section", sectionId: "co-household", loan: screen.loan })} onDone={() => setScreen({ type: "co-section", sectionId: "co-household", loan: screen.loan })} />;
  else if (screen.type === "co-business-entry") { const businessIndex = screen.businessIndex; const loan = screen.loan; content = <BusinessForm number={(businessIndex ?? coBorrowerBusinesses.length) + 1} values={businessIndex === undefined ? {} : coBorrowerBusinesses[businessIndex] ?? {}} onBack={() => setScreen({ type: "co-section", sectionId: "co-business", loan })} onRemove={() => { if (businessIndex !== undefined) setCoBorrowerBusinesses(current => current.filter((_, index) => index !== businessIndex)); setScreen({ type: "co-section", sectionId: "co-business", loan }); }} onSave={business => { setCoBorrowerBusinesses(current => businessIndex === undefined ? [...current, business] : current.map((item, index) => index === businessIndex ? business : item)); addToSet(setStartedCoMakerSections, startedCoMakerSections, "co-business"); setScreen({ type: "co-section", sectionId: "co-business", loan }); }} />; }
  else content = <SubmissionView loan={screen.loan} onBack={() => setScreen({ type: "dashboard" })} onCoMaker={() => setScreen({ type: "co-maker", loan: screen.loan })} />;
  return <div className="min-h-screen bg-white text-[#171717]"><DesktopNavigation {...navProps} /><MobileHeader onOpen={() => setMenuOpen(true)} /><MobileNavigation {...navProps} /><div className="lg:pl-[280px]">{content}</div></div>;
}

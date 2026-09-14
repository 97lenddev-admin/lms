"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { InvestigatorDesktopNavigation, InvestigatorMobileNavigation, MobileHeader } from "../credit-analyst/navigation";
import { AnalysisWorkspace, defaultAnalysisData, type AnalysisData, type AnalysisPage } from "./analysis-pages";

type Tab = "review" | "forwarded";
type InvestigatorStatus = "Open" | "Claimed" | "Yours" | "Active" | "Approved" | "Pending" | "Rejected" | "Inactive";
type Loan = { id: string; name: string; amount: string; submittedBy: string; submitted: string; status: InvestigatorStatus };

const openLoans: Loan[] = [
  { id: "LN-0087", name: "Cruz, Maria", amount: "₱100,000.00", submittedBy: "M. Dela Cruz (CA)", submitted: "Nov 18, 2025", status: "Open" },
  { id: "LN-0142", name: "Garcia, Jose", amount: "₱60,000.00", submittedBy: "J. Santos (CA)", submitted: "Jul 22, 2025", status: "Claimed" },
  { id: "LN-0056", name: "Dela Cruz, Ana", amount: "₱50,000.00", submittedBy: "J. Santos (CA)", submitted: "Jan 30, 2026", status: "Open" },
  { id: "LN-0154", name: "Torres, Ramon", amount: "₱60,000.00", submittedBy: "J. Santos (CA)", submitted: "Apr 12, 2026", status: "Open" },
  { id: "LN-0198", name: "Aquino, Pedro", amount: "₱90,000.00", submittedBy: "M. Dela Cruz (CA)", submitted: "Mar 15, 2026", status: "Open" },
  { id: "LN-0246", name: "Mendoza, Sofia", amount: "₱75,000.00", submittedBy: "A. Villanueva (CA)", submitted: "May 8, 2026", status: "Open" },
];
const claimedLoans: Loan[] = [
  { id: "LN-0023", name: "Reyes, Juan", amount: "₱60,000.00", submittedBy: "J. Santos (CA)", submitted: "Mar 5, 2026", status: "Yours" },
  { id: "LN-0087", name: "Cruz, Maria", amount: "₱100,000.00", submittedBy: "J. Santos (CA)", submitted: "Nov 18, 2025", status: "Approved" },
  { id: "LN-0142", name: "Garcia, Jose", amount: "₱60,000.00", submittedBy: "J. Santos (CA)", submitted: "Jul 22, 2025", status: "Pending" },
  { id: "LN-0056", name: "Dela Cruz, Ana", amount: "₱50,000.00", submittedBy: "J. Santos (CA)", submitted: "Jan 30, 2026", status: "Rejected" },
  { id: "LN-0319", name: "Ramos, Pedro", amount: "₱60,000.00", submittedBy: "J. Santos (CA)", submitted: "Sep 9, 2025", status: "Inactive" },
  { id: "LN-0278", name: "Navarro, Elena", amount: "₱85,000.00", submittedBy: "M. Dela Cruz (CA)", submitted: "May 20, 2026", status: "Yours" },
];
const forwardedLoans: Loan[] = [
  { ...claimedLoans[1] }, { ...claimedLoans[0], status: "Pending" }, { ...claimedLoans[2], status: "Rejected" }, { ...claimedLoans[3] }, { ...claimedLoans[4] },
];

const badgeStyle: Record<InvestigatorStatus, string> = {
  Open: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Claimed: "border-[#d4d4d4] bg-[#fafafa] text-[#525252]", Yours: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Active: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Approved: "border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1]", Pending: "border-[#fde047] bg-[#fefce8] text-[#a16207]", Rejected: "border-[#fca5a5] bg-[#fef2f2] text-[#dc2626]", Inactive: "border-[#d4d4d4] bg-[#fafafa] text-[#525252]",
};
const button = "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

function Badge({ status }: { status: InvestigatorStatus }) { const label = status === "Yours" || status === "Active" ? "Claimed" : status; return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badgeStyle[status]}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>; }

function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:w-[280px]"><Image src="/credit-analyst/icons/search.svg" alt="" width={16} height={16} /><input value={value} onChange={event => onChange(event.target.value)} placeholder="Search name or loan ID" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#737373]" /></label>;
}

function Table({ title, description, loans, forwarded = false, onView: providedOnView }: { title?: string; description?: string; loans: Loan[]; forwarded?: boolean; onView?: (loan: Loan) => void }) {
  const onView = providedOnView ?? (forwarded ? (loan: Loan) => window.dispatchEvent(new CustomEvent<Loan>("view-forwarded-loan", { detail: loan })) : undefined);
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(5); const pageCount = Math.max(1, Math.ceil(loans.length / pageSize)); const currentPage = Math.min(page, pageCount); const rows = loans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("section"));
    const section = title ? sections.find(item => item.querySelector("h2")?.textContent === title) : sections.find(item => !item.querySelector("h2") && item.querySelector("table"));
    const select = section?.querySelector("select");
    if (!select) return;
    select.replaceChildren(...[5, 10, 20].map(size => { const option = document.createElement("option"); option.value = String(size); option.textContent = `${size} per page`; return option; }));
    select.value = String(pageSize);
    const changePageSize = () => { setPageSize(Number(select.value)); setPage(1); };
    select.addEventListener("change", changePageSize);
    return () => select.removeEventListener("change", changePageSize);
  }, [pageSize, title]);
  return <section className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">{title && <div className="px-6 py-5"><h2 className="text-sm font-semibold text-[#171717]">{title}</h2>{description && <p className="mt-0.5 text-sm text-[#525252]">{description}</p>}</div>}<div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed text-left text-sm"><thead className="h-11 border-y border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Loan ID", "Name", "Amount", ...(forwarded ? [] : ["Submitted by", "Date submitted"]), "Status", "Action"].map(label => <th className="px-6 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(loan => <tr className="h-[72px] border-b border-[#e5e5e5] text-[#404040]" key={`${title}-${loan.id}`}><td className="px-6">{loan.id}</td><td className="px-6">{loan.name}</td><td className="px-6">{loan.amount}</td>{!forwarded && <><td className="px-6">{loan.submittedBy}</td><td className="px-6">{loan.submitted}</td></>}<td className="px-6"><Badge status={loan.status === "Yours" ? "Active" : loan.status} /></td><td className="px-6"><div className="flex justify-end gap-3"><button onClick={() => onView?.(loan)} className={button}><Image src="/credit-analyst/icons/eye.svg" alt="" width={20} height={20} />View</button>{forwarded && loan.status === "Approved" && <button className={button}>↗ Voluntary surrender</button>}</div></td></tr>)}</tbody></table>{rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#737373]">No submissions found.</p>}</div><div className="flex h-16 items-center px-6 text-sm"><span>Page {currentPage} of {pageCount}</span><select className="ml-3 h-9 rounded-lg border border-[#d4d4d4] px-3"><option>5 per page</option></select><button disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} className={`${button} ml-auto disabled:opacity-50`}>Previous</button><button disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className={`${button} ml-3 disabled:opacity-50`}>Next</button></div></section>;
}

function MobileCard({ loan, claimed, forwarded, onClaim, onView: providedOnView }: { loan: Loan; claimed?: boolean; forwarded?: boolean; onClaim?: (loan: Loan) => void; onView?: (loan: Loan) => void }) {
  const onView = providedOnView ?? (forwarded ? (item: Loan) => window.dispatchEvent(new CustomEvent<Loan>("view-forwarded-loan", { detail: item })) : undefined);
  const disabled = loan.status === "Claimed";
  return <article className={`overflow-hidden rounded-xl border border-[#e5e5e5] bg-white ${disabled ? "opacity-50" : ""}`}><div className="p-3"><div className="flex items-start"><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#262626]">{loan.name}</h3><p className="mt-0.5 text-sm text-[#737373]">{loan.id} · {loan.amount}</p>{!forwarded && <p className="mt-1 text-sm text-[#737373]">{loan.submittedBy} · {loan.submitted}</p>}</div><Badge status={loan.status} /></div></div><div className="flex min-h-11 items-center gap-5 border-t border-[#e5e5e5] px-4 text-sm font-semibold"><button onClick={() => onView?.(loan)} className="text-[#be123c]">{claimed ? "Continue investigation" : "View"}</button>{!claimed && !disabled && loan.status === "Open" && <button onClick={() => onClaim?.(loan)} className="text-[#be123c]">Claim</button>}{disabled && <span className="font-normal text-[#525252]">Claimed by M. Reyes</span>}{forwarded && loan.status === "Approved" && <button className="text-[#be123c]">Voluntary surrender</button>}{forwarded && loan.status === "Pending" && <span className="font-normal text-[#a3a3a3]">Awaiting decision</span>}</div></article>;
}

const detailSections = [
  { title: "Personal information", fields: [["Last name", "Torres"], ["First name", "Ramon"], ["Middle name", "Villareal"], ["Age", "41"], ["Civil status", "Married"], ["Date of birth", "04 / 12 / 1985"], ["Citizenship", "Filipino"], ["Gender", "Male"], ["Place of birth", "Quezon City, Metro Manila"], ["Permanent address", "15 Mabini Street, Quezon City"], ["Barangay", "Barangay 92"], ["City/Town", "Quezon City"], ["ZIP code", "1100"], ["Region", "NCR"], ["Present address", "Rented"], ["Number of children", "1"], ["Contact number", "0917 456 7890"], ["Email / Facebook address", "ramon.torres@email.com"]] },
  { title: "Children", fields: [] },
  { title: "Business information", fields: [["Business name", "Torres Auto Parts"], ["Type", "Retail"], ["Address", "Quezon City"], ["Years", "7"], ["Gross monthly income", "₱45,000.00"]] },
  { title: "Household information", fields: [["Spouse name", "Torres, Elena"], ["Occupation", "Teacher"], ["Age", "39"], ["Company", "Quezon City National HS"], ["Years", "6"], ["Monthly income/salary", "₱22,000.00"]] },
  { title: "Other information", fields: [["Real and personal properties owned", "None declared"], ["Health declaration", "In good health"]] },
  { title: "Nearest relative to contact", fields: [["Name", "Torres, Manuel"], ["Contact number", "0918 555 3344"], ["Address", "Quezon City, Metro Manila"]] },
];
const documents = [["Business Permit.pdf", "200 KB"], ["Driver’s License (FRONT).png", "2 MB"], ["Driver’s License (BACK).png", "4.2 MB"]];

function ReadOnlyField({ label, value, wide = false, className = "" }: { label: string; value: string; wide?: boolean; className?: string }) {
  return <div className={`${wide ? "lg:col-span-12" : ""} ${className}`}><p className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</p><div className="mt-1.5 flex min-h-10 items-center rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 text-base text-[#525252] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">{value}</div></div>;
}

function ReadOnlyRadioGroup({ label, value, options, className = "" }: { label: string; value: string; options: string[]; className?: string }) {
  return <fieldset className={className}><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</legend><div className={`mt-1.5 grid gap-x-2 gap-y-2 ${options.length > 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>{options.map(option => { const selected = option === value; return <label key={option} className={`flex items-start gap-2 text-sm font-medium leading-5 text-[#404040] ${selected ? "" : "opacity-50"}`}><input type="radio" checked={selected} readOnly disabled aria-label={`${label}: ${option}`} className="sr-only" /><span aria-hidden="true" className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#e11d48]" : "border border-[#d4d4d4] bg-white"}`}>{selected && <span className="size-[6px] rounded-full bg-white" />}</span>{option}</label>; })}</div></fieldset>;
}

function ChildrenTable() {
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Children</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white"><div className="grid grid-cols-[1.15fr_1.45fr_1fr_1fr_.55fr] bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Name</span><span>School</span><span>Grade/Course</span><span>Birthday</span><span>Age</span></div><div className="grid min-h-[64px] grid-cols-[1.15fr_1.45fr_1fr_1fr_.55fr] items-center border-t border-[#e5e5e5] px-4 text-sm text-[#525252]"><span>Torres, Ella</span><span>Quezon City Elementary</span><span>Grade 2</span><span>01/12/2019</span><span>7</span></div></div></section>;
}

function BusinessTable({ fields }: { fields: string[][] }) {
  const value = (label: string) => fields.find(([fieldLabel]) => fieldLabel === label)?.[1] ?? "—";
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Business information</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white"><div className="grid grid-cols-[1.35fr_1fr_1.35fr_.5fr] bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Business name</span><span>Type</span><span>Address</span><span>Years</span></div><div className="grid min-h-[64px] grid-cols-[1.35fr_1fr_1.35fr_.5fr] items-center border-t border-[#e5e5e5] px-4 text-sm text-[#525252]"><span>{value("Business name")}</span><span>{value("Type")}</span><span>{value("Address")}</span><span>{value("Years")}</span></div></div><div className="mt-6 grid grid-cols-2 gap-6"><ReadOnlyField label="Gross monthly income" value={value("Gross monthly income")} /></div></section>;
}

function DesktopDetailSection({ title, fields }: { title: string; fields: string[][] }) {
  if (title === "Children") return <ChildrenTable />;
  if (title === "Business information") return <BusinessTable fields={fields} />;
  const fieldSpan = (label: string) => {
    if (label === "Permanent address" || label === "Address" || label.includes("properties")) return "lg:col-span-12";
    if (["Barangay", "City/Town", "ZIP code", "Region"].includes(label)) return "lg:col-span-3";
    if (["Number of children", "Contact number", "Email / Facebook address"].includes(label)) return "lg:col-span-6";
    if (title === "Nearest relative to contact" && ["Name", "Contact number"].includes(label)) return "lg:col-span-6";
    return "lg:col-span-4";
  };
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">{title}</h2><div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">{fields.map(([label, value]) => label === "Present address" ? <ReadOnlyRadioGroup key={`${title}-${label}`} label={label} value={value} options={["Rented", "Living with parents", "Owned", "Mortgaged", "Others"]} className="lg:col-span-6" /> : label === "Health declaration" ? <ReadOnlyRadioGroup key={`${title}-${label}`} label={label} value={value} options={["In good health", "Has pre-existing illness"]} className="lg:col-span-12" /> : <ReadOnlyField key={`${title}-${label}`} label={label} value={value} className={fieldSpan(label)} />)}</div></section>;
}

function SubmissionDetail({ loan, onBack, onClaim }: { loan: Loan; onBack: () => void; onClaim: (loan: Loan) => void }) {
  const businessName = `${loan.name.split(",")[0]} Trading`;
  useEffect(() => {
    const footerActions = document.querySelector("div.fixed.inset-x-0.bottom-0 > div");
    if (!footerActions) return;
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "Back";
    back.className = `${button} mr-3 hidden lg:inline-flex`;
    back.addEventListener("click", onBack);
    footerActions.insertBefore(back, footerActions.firstChild);
    return () => { back.removeEventListener("click", onBack); back.remove(); };
  }, [onBack]);
  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]"><div className="border-b border-[#e5e5e5] px-4 lg:hidden"><button type="button" onClick={onBack} className="flex h-14 items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />{loan.id}</button></div><header className="px-4 pb-6 pt-6 lg:px-8 lg:pb-8 lg:pt-8"><div className="mx-auto max-w-[1096px]"><button type="button" onClick={onBack} className="relative z-10 hidden min-h-5 cursor-pointer items-center gap-1 text-sm font-semibold leading-5 text-[#525252] lg:inline-flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} />Back to open submissions</button><div className="mt-0 flex items-center gap-2 lg:mt-4"><h1 className="text-xl font-semibold leading-[30px] text-[#171717]">{loan.id} <span className="hidden text-[#171717] lg:inline">— {loan.name}</span></h1><Badge status="Open" /></div><h2 className="mt-5 text-lg font-semibold text-[#171717] lg:hidden">{loan.name}</h2><p className="mt-1 text-sm text-[#737373] lg:text-base lg:text-[#525252]">Submitted {loan.submitted} by {loan.submittedBy} · Caloocan Branch</p><div className="mt-3 rounded-xl border border-[#fca5a5] bg-[#fee2e2] p-3 text-sm leading-5 text-[#dc2626] lg:mt-5 lg:flex lg:items-center lg:gap-3"><Image src="/credit-analyst/icons/lock.svg" alt="" width={20} height={20} className="hidden lg:block" />This submission is unclaimed. Claim it to begin your investigation and unlock notes, documents, and the investigation, cash flow, collateral, and disclosure pages.</div></div></header><div className="px-4 pb-28 lg:px-8"><div className="mx-auto max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white lg:p-6"><div className="lg:hidden"><h2 className="text-xs font-semibold uppercase text-[#404040]">Application — read only</h2><dl className="mt-3 border-l-2 border-[#d4d4d4] bg-[#fafafa] p-3 text-sm"><div className="flex py-1"><dt className="text-[#737373]">Name</dt><dd className="ml-auto font-semibold">{loan.name}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Loan applied</dt><dd className="ml-auto font-semibold">{loan.amount}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Business</dt><dd className="ml-auto font-semibold">{businessName} · Retail</dd></div><div className="flex py-1"><dt className="text-[#737373]">Gross monthly</dt><dd className="ml-auto font-semibold">₱78,000.00</dd></div><div className="flex py-1"><dt className="text-[#737373]">Documents</dt><dd className="ml-auto font-semibold">{documents.length} files</dd></div></dl><h2 className="mt-7 text-xs font-semibold uppercase text-[#404040]">Locked until claimed</h2><div className="mt-3 space-y-3">{["Investigation report", "Cash flow analysis", "Collateral analysis", "Disclosure statement"].map(section => <div key={section} className="flex h-16 items-center rounded-xl border border-[#e5e5e5] px-4 text-[#a3a3a3]"><span className="mr-3 flex size-9 items-center justify-center rounded-full bg-[#fafafa]"><Image src="/credit-analyst/icons/lock.svg" alt="" width={16} height={16} /></span><span>{section}</span><span className="ml-auto text-2xl">›</span></div>)}</div></div><div className="hidden space-y-8 lg:block">{detailSections.map(section => <DesktopDetailSection key={section.title} {...section} />)}<section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Loan details</h2><div className="mt-6 grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value={`${loan.amount.replace(".00", "")} / 60 days`} /><ReadOnlyField label="Loan amount" value={loan.amount.replace(".00", "")} /><ReadOnlyField label="Term" value="60 days" /></div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Supporting documents</h2><div className="mt-6 space-y-3">{documents.map(([name, size]) => <div key={name} className="flex h-[74px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium text-[#404040]">{name}</p><p className="mt-0.5 text-sm text-[#525252]">{size} · Uploaded {loan.submitted}</p></div></div>)}</div></section></div></div></div><div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] justify-end"><button onClick={() => onClaim(loan)} className="h-9 w-full rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] lg:w-auto">Claim submission</button></div></div></div>;
}

const analysisPageDefinitions: { id: AnalysisPage; title: string; detail: string }[] = [
  { id: "investigation", title: "Investigation report", detail: "Recommended ₱65,000 · 1 undisclosed loan" },
  { id: "cashflow", title: "Cash flow analysis", detail: "Net ₱26,000 · capacity ₱9,100" },
  { id: "collateral", title: "Collateral analysis", detail: "No items recorded" },
  { id: "disclosure", title: "Disclosure statement", detail: "Auto-computed · needs a term" },
];

function ForwardApprovalModal({ loan, recommendedAmount, onClose }: { loan: Loan; recommendedAmount: string; onClose: () => void }) {
  const [remarks, setRemarks] = useState("");
  const amount = Number(recommendedAmount.replace(/[^0-9.-]/g, "")) || 65000;
  const netProceeds = amount - amount * .18 - 600 - 400;
  const formatMoney = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return <div role="dialog" aria-modal="true" aria-labelledby="forward-title" className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:px-8 lg:py-8">
    <button aria-label="Close forward dialog" className="absolute inset-0 cursor-default bg-[#0a0a0a]/70 backdrop-blur-[8px]" onClick={onClose} />
    <div className="relative w-full rounded-t-2xl bg-white shadow-2xl lg:max-w-[640px] lg:rounded-2xl">
      <div className="px-4 pb-5 pt-5 lg:px-6 lg:pb-5 lg:pt-6">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg lg:right-4 lg:top-4"><Image src="/credit-analyst/icons/x-close.svg" alt="" width={20} height={20} /></button>
        <h2 id="forward-title" className="pr-10 text-lg font-semibold leading-7 text-[#171717] lg:text-base lg:leading-6">Forward to Branch Manager?</h2>
        <p className="mt-4 text-sm leading-5 text-[#525252] lg:mt-0.5">Your investigation of {loan.id} — {loan.name} will be sent to the Branch Manager for approval. You won&apos;t be able to edit your findings once forwarded.</p>
        <dl className="mt-4 space-y-2 rounded-lg bg-[#fafafa] p-3 text-sm lg:mt-4 lg:bg-white lg:p-0">
          <div className="flex justify-between gap-4"><dt className="text-[#737373]">Recommended amount</dt><dd className="font-medium text-[#171717]">{formatMoney(amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#737373]">Term</dt><dd className="font-medium text-[#171717]">100 days</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#737373]">Net proceeds</dt><dd className="font-medium text-[#171717]">{formatMoney(netProceeds)}</dd></div>
        </dl>
        <label className="mt-5 block text-sm font-medium text-[#404040] lg:mt-4">Remarks for the approver <span className="lg:hidden">—</span><span className="hidden lg:inline">(</span> optional<span className="hidden lg:inline">)</span>
          <textarea value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add a note for the Branch Manager" className="mt-2 h-10 w-full resize-none rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] lg:h-[116px] lg:py-3" />
        </label>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3">
        <button onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] lg:order-none"><span className="lg:hidden">Go back</span><span className="hidden lg:inline">Cancel</span></button>
        <button onClick={onClose} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)]">Forward for approval</button>
      </div>
    </div>
  </div>;
}

function RejectApplicationModal({ loan, step, onClose, onContinue }: { loan: Loan; step: 1 | 2; onClose: () => void; onContinue: () => void }) {
  const [reason, setReason] = useState("Undisclosed existing loan");
  const [detail, setDetail] = useState("");
  const reasons = ["Undisclosed existing loan", "Insufficient debt capacity", "Business could not be verified", "Other"];
  const shell = "relative w-full rounded-t-2xl bg-white shadow-2xl lg:max-w-[640px] lg:rounded-2xl";
  const closeButton = <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg lg:right-4 lg:top-4"><Image src="/credit-analyst/icons/x-close.svg" alt="" width={20} height={20} /></button>;
  const reasonPanel = <div className={shell}>
    {closeButton}
    <div className="px-4 pb-5 pt-6 lg:px-6 lg:pb-5"><h2 className="pr-10 text-lg font-semibold text-[#be123c] lg:text-base lg:text-[#171717]">Reason for rejection</h2><p className="mt-5 text-sm leading-5 text-[#525252] lg:mt-1">Select why {loan.id} — {loan.name} is being rejected.</p>
      <fieldset className="mt-5"><legend className="text-sm font-medium text-[#404040]">Reason <span className="ml-1 text-[#be123c]"><span className="hidden lg:inline">*</span><span className="lg:hidden">Required</span></span></legend><div className="mt-3 space-y-3">{reasons.map(item => <label key={item} className={`flex items-center gap-3 text-sm ${item === reason ? "text-[#404040]" : "text-[#525252] lg:text-[#a3a3a3]"}`}><input type="radio" name="rejection-reason" value={item} checked={reason === item} onChange={() => setReason(item)} className="size-4 accent-[#e11d48]" />{item}</label>)}</div></fieldset>
      <label className="mt-5 block text-sm font-medium text-[#404040]"><span className="hidden lg:inline">Additional detail (optional)</span><textarea value={detail} onChange={event => setDetail(event.target.value)} placeholder="Add detail for the credit analyst…" className="mt-2 h-[72px] w-full resize-none rounded-lg border border-[#d4d4d4] px-3 py-3 text-sm outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] lg:h-[116px]" /></label>
    </div>
    <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3"><button onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] lg:order-none">Go back</button><button onClick={onContinue} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white">Reject application</button></div>
  </div>;
  const confirmPanel = <div className={shell}>
    {closeButton}
    <div className="px-4 pb-5 pt-6 lg:px-6 lg:pb-5"><h2 className="pr-10 text-lg font-semibold text-[#be123c] lg:text-base lg:text-[#171717]">Reject this application?</h2><p className="mt-5 text-sm font-semibold leading-5 text-[#be123c] lg:mt-1 lg:font-normal lg:text-[#525252]">{loan.id} — {loan.name} will be rejected and returned to J. Santos (CA). This cannot be undone.</p><p className="mt-5 hidden text-sm font-semibold text-[#be123c] lg:block">This is permanent.</p><p className="mt-4 text-sm leading-5 text-[#525252]">Rejected applications cannot be reopened or resubmitted — a new application would need to start from scratch. J. Santos (CA) will be notified immediately. Make sure you&apos;ve verified everything before continuing.</p></div>
    <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3"><button onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] lg:order-none">Cancel</button><button onClick={onContinue} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white">Continue</button></div>
  </div>;

  return <div role="dialog" aria-modal="true" aria-label="Reject application" className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:px-8 lg:py-8"><button aria-label="Close rejection dialog" className="absolute inset-0 cursor-default bg-[#0a0a0a]/70 backdrop-blur-[8px]" onClick={onClose} /><div className="contents lg:hidden">{step === 1 ? confirmPanel : reasonPanel}</div><div className="hidden lg:contents">{step === 1 ? reasonPanel : confirmPanel}</div></div>;
}

type SurrenderItem = { description: string; model: string; serial: string; rate: string };

function VoluntarySurrenderScreen({ loan, onBack }: { loan: Loan; onBack: () => void }) {
  const [items, setItems] = useState<SurrenderItem[]>([{ description: "Motorcycle", model: "Honda XRM", serial: "VIN 8F3K...", rate: "18000" }]);
  const [attestation, setAttestation] = useState<File | null>(null);
  const updateItem = (index: number, key: keyof SurrenderItem, value: string) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const addItem = () => setItems(current => [...current, { description: "", model: "", serial: "", rate: "" }]);
  const attestations = ["The turn-over of the unit/s was conducted in an orderly manner without the use of force upon any person/s or property.", "The representative/s of QVDS left the client's domicile without taking any property not subject to seizure.", "This statement was made freely and voluntarily, without the use of force, threat, or intimidation.", "Before signing, the contents of this statement were translated into a language known to the client, and understood by them."];
  const inputClass = "h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]";

  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]"><header className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4 lg:hidden"><button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Voluntary surrender</button><button onClick={onBack} className="text-sm font-semibold text-[#be123c]">Cancel</button></header><main className="mx-auto max-w-[1160px] px-4 pb-28 pt-6 lg:px-8 lg:pb-24 lg:pt-8"><button onClick={onBack} className="hidden items-center gap-1 text-sm font-semibold text-[#525252] lg:flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Back to {loan.id} — {loan.name}</button><div className="mt-0 lg:mt-5"><div className="flex items-start justify-between lg:justify-start lg:gap-2"><div><h1 className="text-xl font-semibold lg:text-lg"><span className="lg:hidden">{loan.name}</span><span className="hidden lg:inline">Voluntary surrender of unit</span></h1><p className="mt-1 text-sm text-[#737373] lg:hidden">{loan.id} · {loan.amount}</p></div><span className="inline-flex rounded-full border border-[#7dd3fc] bg-[#f0f9ff] px-2 py-1 text-xs text-[#0369a1]"><span className="mr-1">●</span>Approved loan</span></div><p className="mt-5 max-w-[620px] text-base leading-6 text-[#525252] lg:mt-1 lg:text-sm">Record items voluntarily surrendered due to inability to pay the daily installment.</p></div><div className="mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:p-6"><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Surrendered items</h2><div className="mt-3 space-y-3 lg:mt-6">{items.map((item, index) => <div key={index}><div className="hidden grid-cols-[1.8fr_.8fr_.8fr_1.1fr_auto] gap-5 rounded-xl border border-[#e5e5e5] p-4 lg:grid"><label className="text-[11px] font-semibold uppercase text-[#737373]">Item description<input className={`${inputClass} mt-2 font-normal normal-case`} value={item.description} onChange={event => updateItem(index, "description", event.target.value)} placeholder="e.g. Motorcycle, Car" /></label><label className="text-[11px] font-semibold uppercase text-[#737373]">Model/Brand<input className={`${inputClass} mt-2 font-normal normal-case`} value={item.model} onChange={event => updateItem(index, "model", event.target.value)} placeholder="Model/Make" /></label><label className="text-[11px] font-semibold uppercase text-[#737373]">Engine/Serial no.<input className={`${inputClass} mt-2 font-normal normal-case`} value={item.serial} onChange={event => updateItem(index, "serial", event.target.value)} placeholder="VIN" /></label><label className="text-[11px] font-semibold uppercase text-[#737373]">Rate<input className={`${inputClass} mt-2 font-normal normal-case`} value={item.rate} onChange={event => updateItem(index, "rate", event.target.value)} inputMode="decimal" placeholder="₱0.00" /></label><button onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Delete item" className="mt-7 flex size-10 items-center justify-center"><Image src="/credit-analyst/icons/trash-analysis.svg" alt="" width={16} height={16} /></button></div><div className="flex min-h-[68px] items-center rounded-xl border border-[#e5e5e5] px-3 lg:hidden"><div><p className="font-medium">{item.description || "New item"}</p><p className="mt-1 text-sm text-[#737373]">{item.model || "Model"} · {item.serial || "Serial no."} · {item.rate ? `₱${Number(item.rate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "₱0.00"}</p></div><span className="ml-auto text-2xl text-[#a3a3a3]">›</span></div></div>)}</div><button onClick={addItem} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#d4d4d4] text-sm font-semibold text-[#737373] lg:w-auto lg:border-solid lg:px-4"><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add item</button></section><section className="mt-7"><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Attestation</h2><div className="mt-3 rounded-lg bg-[#fafafa] p-3 lg:mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:bg-white">{attestations.map(text => <p key={text} className="mb-3 flex text-sm leading-5 text-[#737373] last:mb-0 lg:text-[#525252]"><span className="mr-2 text-[#e11d48] lg:font-semibold">{`•`}</span>{text}</p>)}</div><p className="mt-4 rounded-xl border border-[#fb7185] px-3 py-3 text-sm font-semibold leading-5 text-[#be123c] lg:border-0 lg:bg-[#fee2e2]">Signed on paper by the client and the QVDS representative. Attach the signed copy below<span className="hidden lg:inline"> — the record is incomplete without it.</span></p><h3 className="mt-5 hidden border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040] lg:block">Signed attestation</h3><label className="mt-3 flex h-[78px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#d4d4d4] text-sm font-semibold text-[#525252] lg:h-[126px]"><input type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => setAttestation(event.target.files?.[0] ?? null)} />{attestation ? <><span>{attestation.name}</span><span className="mt-1 text-xs font-normal text-[#737373]">Click to replace</span></> : <><Image src="/credit-analyst/icons/camera.svg" alt="" width={22} height={22} className="hidden lg:block" /><span className="lg:mt-2"><span className="lg:hidden">Photograph signed attestation</span><span className="hidden text-[#be123c] lg:inline">Click to upload</span><span className="hidden font-normal lg:inline"> or take a photo</span></span><span className="mt-1 text-xs font-normal text-[#a3a3a3]">PNG, JPG (max. 5MB)</span></>}</label></section></div></main><footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] justify-end gap-3"><button onClick={onBack} className="hidden h-10 rounded-lg border border-[#d4d4d4] px-4 text-sm font-semibold text-[#404040] lg:block">Cancel</button><button onClick={onBack} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white lg:w-auto"><Image src="/credit-analyst/icons/save-analysis.svg" alt="" width={16} height={16} className="hidden lg:block" />Save voluntary surrender</button></div></footer></div>;
}

function ClaimedSubmissionDetail({ loan, onBack, readOnly = false }: { loan: Loan; onBack: () => void; readOnly?: boolean }) {
  const [lastName, firstName] = loan.name.split(",").map(value => value.trim());
  const [analysisPage, setAnalysisPage] = useState<AnalysisPage | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData>(defaultAnalysisData);
  const [completedAnalyses, setCompletedAnalyses] = useState<AnalysisPage[]>(readOnly ? ["investigation", "cashflow", "collateral", "disclosure"] : []);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [rejectStep, setRejectStep] = useState<0 | 1 | 2>(0);
  const analysisPages = analysisPageDefinitions.map(page => ({
    ...page,
    done: completedAnalyses.includes(page.id),
    active: false,
  }));
  useEffect(() => {
    if (readOnly) return;
    const footerBack = Array.from(document.querySelectorAll("footer button")).find(control => control.textContent?.trim() === "Back");
    if (!footerBack) return;
    footerBack.addEventListener("click", onBack);
    return () => footerBack.removeEventListener("click", onBack);
  }, [onBack, readOnly]);
  const applicantSections = [
    { title: "Personal information", fields: [["Last name", lastName], ["First name", firstName], ["Middle name", "Santos"], ["Age", "34"], ["Civil status", "Married"], ["Date of birth", "04 / 12 / 1991"], ["Citizenship", "Filipino"], ["Gender", "Male"], ["Place of birth", "Caloocan City, Metro Manila"], ["Permanent address", "42 Samson Road, Caloocan City"], ["Barangay", "Barangay 174"], ["City/Town", "Caloocan City"], ["ZIP code", "1422"], ["Region", "NCR"], ["Present address", "Rented"], ["Number of children", "1"], ["Contact number", "0917 123 4567"], ["Email / Facebook address", `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`]] },
    { title: "Business information", fields: [["Business name", `${lastName} Hardware Supply`], ["Type", "Retail"], ["Address", "Caloocan City"], ["Years", "7"], ["Gross monthly income", "₱45,000.00"]] },
    { title: "Household information", fields: [["Spouse name", `${lastName}, Liza`], ["Occupation", "Teacher"], ["Age", "32"], ["Company", "Caloocan North National HS"], ["Years", "6"], ["Monthly income/salary", "₱22,000.00"]] },
    { title: "Other information", fields: [["Real and personal properties owned", "None declared"], ["Health declaration", "In good health"]] },
    { title: "Nearest relative to contact", fields: [["Name", `${lastName}, Carlos`], ["Contact number", "0918 555 2211"], ["Address", "Caloocan City, Metro Manila"]] },
  ];
  useEffect(() => {
    if (analysisPage) return;
    const pageByLabel = new Map<string, AnalysisPage>([["Investigation report", "investigation"], ["Cash flow analysis", "cashflow"], ["Collateral analysis", "collateral"], ["Disclosure statement", "disclosure"]]);
    const controls = Array.from(document.querySelectorAll("button")).flatMap(control => {
      const match = Array.from(pageByLabel.entries()).find(([label]) => control.textContent?.includes(label));
      if (!match) return [];
      control.classList.remove("opacity-50");
      const open = () => setAnalysisPage(match[1]);
      control.addEventListener("click", open);
      return [{ control, open }];
    });
    return () => controls.forEach(({ control, open }) => control.removeEventListener("click", open));
  }, [analysisPage]);
  useEffect(() => {
    if (analysisPage) return;
    const complete = completedAnalyses.length === 4;
    const forwardButtons = Array.from(document.querySelectorAll("footer button")).filter(control => control.textContent?.trim() === "Forward for approval") as HTMLButtonElement[];
    forwardButtons.forEach(control => {
      control.disabled = !complete;
      control.style.backgroundColor = complete ? "#e11d48" : "#ffffff";
      control.style.borderColor = complete ? "#e11d48" : "#e5e5e5";
      control.style.color = complete ? "#ffffff" : "#a3a3a3";
      control.style.cursor = complete ? "pointer" : "not-allowed";
      control.onclick = complete ? () => setForwardOpen(true) : null;
    });
    const rejectButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("footer button")).filter(control => control.textContent?.trim() === "Reject application");
    rejectButtons.forEach(control => { control.onclick = () => setRejectStep(1); });

    const pageByLabel = new Map(analysisPageDefinitions.map(page => [page.title, page.id]));
    const desktopTabs = Array.from(document.querySelectorAll<HTMLButtonElement>("button.h-8")).filter(control =>
      Array.from(pageByLabel.keys()).some(label => control.textContent?.trim().startsWith(label)),
    );
    desktopTabs.forEach(control => {
      const entry = Array.from(pageByLabel.entries()).find(([label]) => control.textContent?.trim().startsWith(label));
      if (!entry) return;
      let statusIcon = control.querySelector<HTMLImageElement>('img[data-analysis-status="true"]');
      const existingStatusIcon = control.querySelector<HTMLImageElement>('img[alt="Complete"]');
      if (existingStatusIcon && existingStatusIcon !== statusIcon) {
        statusIcon?.remove();
        statusIcon = existingStatusIcon;
        statusIcon.dataset.analysisStatus = "true";
      }
      if (!statusIcon) {
        statusIcon = document.createElement("img");
        statusIcon.dataset.analysisStatus = "true";
        statusIcon.width = 16;
        statusIcon.height = 16;
        control.appendChild(statusIcon);
      }
      const isComplete = completedAnalyses.includes(entry[1]);
      statusIcon.src = isComplete ? "/credit-analyst/icons/check-circle.svg" : "/credit-analyst/icons/analysis-incomplete-alt.svg";
      statusIcon.alt = isComplete ? "Complete" : "Incomplete";
    });

    const progressLabel = Array.from(document.querySelectorAll<HTMLSpanElement>("span")).find(control => /of 4 analysis pages complete$/.test(control.textContent?.trim() ?? ""));
    if (progressLabel) {
      const percent = completedAnalyses.length * 25;
      progressLabel.textContent = `${completedAnalyses.length} of 4 analysis pages complete`;
      if (progressLabel.nextElementSibling) progressLabel.nextElementSibling.textContent = `${percent}%`;
      const progressBar = progressLabel.parentElement?.nextElementSibling?.firstElementChild as HTMLElement | null;
      if (progressBar) progressBar.style.width = `${percent}%`;
    }
  }, [analysisPage, completedAnalyses, readOnly]);
  const saveAnalysis = (page: AnalysisPage) => setCompletedAnalyses(current => current.includes(page) ? current : [...current, page]);
  if (analysisPage) return <><div className={readOnly ? "[&_footer]:hidden [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none" : ""}><AnalysisWorkspace page={analysisPage} loanId={loan.id} applicant={loan.name} data={analysisData} setData={readOnly ? () => undefined : setAnalysisData} completed={completedAnalyses} onSave={readOnly ? () => undefined : saveAnalysis} onBack={() => setAnalysisPage(null)} onNavigate={setAnalysisPage} onReject={() => setRejectStep(1)} /></div>{!readOnly && rejectStep !== 0 && <RejectApplicationModal loan={loan} step={rejectStep} onClose={() => setRejectStep(0)} onContinue={() => rejectStep === 1 ? setRejectStep(2) : setRejectStep(0)} />}</>;
  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]">
    <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4 lg:hidden"><button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />{loan.id}</button>{!readOnly && <button className="text-sm font-semibold text-[#be123c]">Release</button>}</div>
    <main className="mx-auto max-w-[1144px] px-4 pb-32 pt-6 lg:px-6 lg:pb-24 lg:pt-8">
      <button onClick={onBack} className="hidden items-center gap-1 text-sm font-semibold text-[#525252] lg:flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Back to {readOnly ? "forwarded" : "my submissions"}</button>
      <div className="lg:mt-4"><div className="flex items-center gap-2"><h1 className="text-base font-medium text-[#171717] lg:text-xl lg:font-semibold">{loan.id}<span className="hidden text-[#171717] lg:inline"> — {loan.name}</span></h1><span className="hidden lg:inline-flex"><Badge status={loan.status} /></span></div><h2 className="mt-0 text-base font-medium text-[#171717] lg:hidden">{loan.name}</h2><p className="mt-1 text-xs text-[#737373] lg:text-sm lg:text-[#525252]">Submitted {loan.submitted} by {loan.submittedBy} · Caloocan Branch</p></div>
      <section className="mt-6 lg:hidden"><h2 className="border-b border-[#e5e5e5] pb-2 text-xs font-semibold uppercase text-[#404040]">Application — read only</h2><dl className="mt-3 space-y-2 border-l-2 border-[#d4d4d4] bg-[#fafafa] p-3 text-sm"><div className="flex justify-between"><dt className="text-[#737373]">Loan applied</dt><dd className="font-medium">{loan.amount}</dd></div><div className="flex justify-between"><dt className="text-[#737373]">Declared business</dt><dd className="font-medium">{lastName} Hardware Supply</dd></div><div className="flex justify-between"><dt className="text-[#737373]">Declared income</dt><dd className="font-medium">₱45,000.00 / mo</dd></div></dl><button className="mt-3 text-sm font-semibold text-[#be123c]">View full application</button></section>
      <section className="mt-7 lg:mt-3"><div className="hidden flex-wrap gap-2 lg:flex">{analysisPages.map(page => <button key={page.title} className="flex h-8 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#525252] shadow-sm">{page.title}{page.done && <Image src="/credit-analyst/icons/check-circle.svg" alt="Complete" width={16} height={16} />}</button>)}</div><div className="lg:hidden"><div className="flex justify-between text-xs text-[#525252]"><span>2 of 4 analysis pages complete</span><span>50%</span></div><div className="mt-1 h-2 rounded-full bg-[#e5e5e5]"><div className="h-2 w-[57.5%] rounded-full bg-[#e11d48]" /></div><div className="mt-6 space-y-3">{analysisPages.map((page, index) => <button key={page.title} className={`flex min-h-[70px] w-full items-center rounded-xl border p-4 text-left ${page.active ? "border-[#f59e0b]" : "border-[#e5e5e5]"} ${index === 3 ? "opacity-50" : ""}`}><span className={`mr-3 flex size-8 shrink-0 items-center justify-center rounded-full ${page.done ? "bg-[#dcfce7] text-[#16a34a]" : page.active ? "bg-[#fef9c3] text-[#d97706]" : "bg-[#fafafa] text-[#a3a3a3]"}`}>{page.done ? <Image src="/credit-analyst/icons/check-circle.svg" alt="Complete" width={16} height={16} /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#525252]">{page.title}</span><span className="block text-xs text-[#737373]">{page.detail}</span></span>{page.active ? <span className="rounded-full border border-[#fde047] bg-[#fefce8] px-2 py-1 text-xs text-[#a16207]">In progress</span> : <span className="text-2xl text-[#a3a3a3]">›</span>}</button>)}</div><div className="mt-3 rounded-xl border border-[#fca5a5] bg-[#fee2e2] p-3 text-sm leading-5 text-[#dc2626]"><strong>1 undisclosed lending found.</strong> Policy requires review when the applicant did not declare an existing loan. Review before forwarding.</div></div></section>
      <div className="mt-6 hidden rounded-xl border border-[#e5e5e5] bg-white p-6 lg:block"><div className="space-y-8">{applicantSections.slice(0, 1).map(section => <DesktopDetailSection key={section.title} {...section} />)}<section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Children</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5]"><div className="grid grid-cols-5 bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Name</span><span>School</span><span>Grade/Course</span><span>Birthday</span><span>Age</span></div><div className="grid grid-cols-5 px-4 py-5 text-sm"><span>{lastName}, Ella</span><span>Caloocan North Elementary</span><span>Grade 2</span><span>01/12/2019</span><span>7</span></div></div></section>{applicantSections.slice(1).map(section => <DesktopDetailSection key={section.title} {...section} />)}<section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Co-maker</h2><div className="mt-6 flex items-center rounded-xl border border-[#e5e5e5] p-4"><Image src="/credit-analyst/icons/check-circle.svg" alt="Complete" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium">Santos, Roberto D</p><p className="text-xs text-[#737373]">Sibling · Added by CA on Mar 5, 2026</p></div><button className={`${button} ml-auto`}><Image src="/credit-analyst/icons/eye.svg" alt="" width={16} height={16} />View details</button></div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Loan details</h2><div className="mt-6 grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value={`${loan.amount.replace(".00", "")} / 60 days`} /><ReadOnlyField label="Loan amount" value={loan.amount.replace(".00", "")} /><ReadOnlyField label="Term" value="60 days" /></div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Supporting documents</h2><div className="mt-6 space-y-3">{documents.map(([name, size]) => <div key={name} className="flex h-[74px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium">{name}</p><p className="text-xs text-[#737373]">{size} · Uploaded Mar 5, 2026</p></div></div>)}</div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Projected payment schedule</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5]"><div className="grid grid-cols-[120px_1fr_1fr] bg-[#fafafa] px-6 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Payment no.</span><span>Due date</span><span>Amount</span></div>{Array.from({ length: 10 }, (_, index) => <div key={index} className="grid min-h-[60px] grid-cols-[120px_1fr_1fr] items-center border-t border-[#e5e5e5] px-6 text-sm"><span>{String(index + 1).padStart(3, "0")}</span><span>{index < 7 ? `Jun ${24 + index}, 2026` : `Jul ${index - 6}, 2026`}</span><span className="font-medium">₱1,108.00</span></div>)}</div></section></div></div>
    </main>
    {!readOnly && <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] flex-col gap-3 lg:flex-row lg:items-center"><button className="order-2 h-9 rounded-lg border border-[#e11d48] px-4 text-sm font-semibold text-[#be123c] lg:order-none">Reject application</button><div className="ml-auto hidden gap-3 lg:flex"><button className={button}>Release submission</button><button className={button}>Back</button><button className="h-9 rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white">Forward for approval</button></div><button disabled className="h-9 rounded-lg border border-[#e5e5e5] text-sm font-semibold text-[#a3a3a3] lg:hidden">Forward for approval</button></div></footer>}
    {!readOnly && forwardOpen && <ForwardApprovalModal loan={loan} recommendedAmount={analysisData.recommendedAmount} onClose={() => setForwardOpen(false)} />}
    {!readOnly && rejectStep !== 0 && <RejectApplicationModal loan={loan} step={rejectStep} onClose={() => setRejectStep(0)} onContinue={() => rejectStep === 1 ? setRejectStep(2) : setRejectStep(0)} />}
  </div>;
}

export default function CreditInvestigatorApp() {
  const [tab, setTab] = useState<Tab>("review"); const [menuOpen, setMenuOpen] = useState(false); const [query, setQuery] = useState(""); const [status, setStatus] = useState("All"); const [availableLoans, setAvailableLoans] = useState(openLoans); const [myLoans, setMyLoans] = useState(claimedLoans); const [selectedLoan, setSelectedLoan] = useState<{ loan: Loan; source: "open" | "claimed" | "forwarded" } | null>(null); const [surrenderLoan, setSurrenderLoan] = useState<Loan | null>(null);
  const match = (loan: Loan) => `${loan.id} ${loan.name}`.toLowerCase().includes(query.toLowerCase()) && (status === "All" || loan.status === status);
  const open = availableLoans.filter(match);
  const claimed = myLoans.filter(match);
  const forwarded = forwardedLoans.filter(match);
  useEffect(() => {
    const viewForwarded = (event: Event) => setSelectedLoan({ loan: (event as CustomEvent<Loan>).detail, source: "forwarded" });
    window.addEventListener("view-forwarded-loan", viewForwarded);
    return () => window.removeEventListener("view-forwarded-loan", viewForwarded);
  }, []);
  useEffect(() => {
    if (tab !== "forwarded") return;
    const actions = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).flatMap(control => {
      if (!control.textContent?.trim().endsWith("Voluntary surrender")) return [];
      const container = control.closest("tr, article");
      const loanId = container?.textContent?.match(/LN-\d+/)?.[0];
      const loan = forwardedLoans.find(item => item.id === loanId);
      if (!loan) return [];
      const openSurrender = () => setSurrenderLoan(loan);
      control.addEventListener("click", openSurrender);
      return [{ control, openSurrender }];
    });
    return () => actions.forEach(({ control, openSurrender }) => control.removeEventListener("click", openSurrender));
  }, [tab, query, status]);
  const claimLoan = (loan: Loan) => { const claimedLoan: Loan = { ...loan, status: "Claimed" }; const ownedLoan: Loan = { ...loan, status: "Yours" }; setAvailableLoans(current => current.map(item => item.id === loan.id ? claimedLoan : item)); setMyLoans(current => current.some(item => item.id === loan.id) ? current.map(item => item.id === loan.id ? ownedLoan : item) : [ownedLoan, ...current]); };
  const navigate = (target: Tab) => { setTab(target); setMenuOpen(false); setQuery(""); setStatus("All"); };
  if (surrenderLoan) return <><InvestigatorDesktopNavigation active="forwarded" mobileOpen={false} onClose={() => undefined} onNavigate={navigate} /><VoluntarySurrenderScreen loan={surrenderLoan} onBack={() => setSurrenderLoan(null)} /></>;
  if (selectedLoan) { const isForwarded = selectedLoan.source === "forwarded"; const isClaimed = isForwarded || selectedLoan.source === "claimed" || selectedLoan.loan.status === "Claimed" || selectedLoan.loan.status === "Yours"; return <><InvestigatorDesktopNavigation active={isForwarded ? "forwarded" : "review"} mobileOpen={false} onClose={() => undefined} onNavigate={navigate} />{isClaimed ? <ClaimedSubmissionDetail loan={selectedLoan.loan} onBack={() => setSelectedLoan(null)} readOnly={isForwarded} /> : <SubmissionDetail loan={selectedLoan.loan} onBack={() => setSelectedLoan(null)} onClaim={loan => { claimLoan(loan); setSelectedLoan(null); }} />}</>; }
  return <div className="min-h-screen bg-white text-[#171717]"><InvestigatorDesktopNavigation active={tab} mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} /><MobileHeader onOpen={() => setMenuOpen(true)} /><InvestigatorMobileNavigation active={tab} mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} /><main className="lg:ml-[280px]"><div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 lg:px-8 lg:pt-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-start"><div className="flex-1"><h1 className="text-2xl font-semibold leading-8 lg:text-xl lg:leading-[30px]">{tab === "review" ? "Submissions to review" : "Forwarded"}</h1>{tab === "forwarded" && <p className="mt-2 max-w-[440px] text-base leading-6 text-[#525252]">Loans you&apos;ve forwarded for approval — track their outcome and initiate voluntary surrender if needed.</p>}</div><div className="flex gap-3"><Search value={query} onChange={setQuery} /><select value={status} onChange={event => setStatus(event.target.value)} className="hidden h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:block"><option>All</option>{["Open", "Claimed", "Yours", "Active", "Approved", "Pending", "Rejected", "Inactive"].map(value => <option key={value}>{value}</option>)}</select></div></div>{tab === "forwarded" && <div className="mt-3 flex gap-1 lg:hidden"><button onClick={() => navigate("review")} className="h-9 px-3 text-sm font-semibold text-[#737373]">To review</button><button className="h-9 rounded-lg border border-[#e11d48] bg-[#fff1f2] px-3 text-sm font-semibold text-[#be123c]">Forwarded</button></div>}<div className="mt-8 hidden space-y-6 lg:block">{tab === "review" ? <><Table title="Open Submissions" description="Unclaimed — available for any investigator to review" loans={open} onView={loan => setSelectedLoan({ loan, source: "open" })} /><Table title="My submissions" description="Claimed by you — review and forward or reject" loans={claimed} onView={loan => setSelectedLoan({ loan, source: "claimed" })} /></> : <Table loans={forwarded} forwarded />}</div><div className="mt-8 space-y-7 lg:hidden">{tab === "review" ? <><section><h2 className="mb-3 text-xs font-semibold uppercase text-[#525252]">Claimed by you · {claimed.length}</h2><div className="space-y-3">{claimed.map(loan => <MobileCard key={loan.id} loan={loan} claimed onView={item => setSelectedLoan({ loan: item, source: "claimed" })} />)}{claimed.length === 0 && <p className="text-sm text-[#737373]">No claimed submissions found.</p>}</div></section><section><h2 className="text-xs font-semibold uppercase text-[#525252]">Open submissions · {open.length}</h2><p className="mb-3 mt-2 text-base text-[#525252]">Unclaimed — available for any investigator.</p><div className="space-y-3">{open.map(loan => <MobileCard key={loan.id} loan={loan} onClaim={claimLoan} onView={item => setSelectedLoan({ loan: item, source: "open" })} />)}{open.length === 0 && <p className="text-sm text-[#737373]">No open submissions found.</p>}</div></section></> : <div className="space-y-3">{forwarded.map(loan => <MobileCard key={loan.id} loan={loan} forwarded />)}{forwarded.length === 0 && <p className="text-sm text-[#737373]">No forwarded submissions found.</p>}</div>}</div></div></main></div>;
}

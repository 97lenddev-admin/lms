"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { UserProfileIdentity } from "@/lib/supabase/user-role";
import { InvestigatorDesktopNavigation, InvestigatorMobileNavigation, MobileHeader } from "../credit-analyst/navigation";
import { AnalysisWorkspace, defaultAnalysisData, type AnalysisData, type AnalysisPage, type AnalysisSaveResult } from "./analysis-pages";
import { claimLoanSubmission, forwardLoanForApproval, rejectCreditInvestigation, saveCollateralAnalysis, saveInvestigationReport, saveVoluntarySurrender, type ClaimLoanResult, type ForwardLoanResult } from "./actions";
import type {
  InvestigatorLoan as Loan,
  InvestigatorStatus,
  SurrenderedItem as SurrenderItem,
} from "./loans";

type Tab = "review" | "forwarded";

const badgeStyle: Record<InvestigatorStatus, string> = {
  Open: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Claimed: "border-[#d4d4d4] bg-[#fafafa] text-[#525252]", Yours: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Active: "border-[#86efac] bg-[#f0fdf4] text-[#15803d]", Approved: "border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1]", Pending: "border-[#fde047] bg-[#fefce8] text-[#a16207]", Rejected: "border-[#fca5a5] bg-[#fef2f2] text-[#dc2626]", Inactive: "border-[#d4d4d4] bg-[#fafafa] text-[#525252]",
};

const forwardedStatuses: InvestigatorStatus[] = ["Active", "Approved", "Inactive"];

function isForwardedStatus(status: InvestigatorStatus) {
  return forwardedStatuses.includes(status);
}
const button = "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#404040] shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

function Badge({ status }: { status: InvestigatorStatus }) { const label = status === "Yours" ? "Claimed" : status; return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badgeStyle[status]}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>; }

function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:w-[280px]"><Image src="/credit-analyst/icons/search.svg" alt="" width={16} height={16} /><input value={value} onChange={event => onChange(event.target.value)} placeholder="Search name or loan ID" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#737373]" /></label>;
}

function Table({ title, description, loans, forwarded = false, onView: providedOnView, onSurrender }: { title?: string; description?: string; loans: Loan[]; forwarded?: boolean; onView?: (loan: Loan) => void; onSurrender?: (loan: Loan) => void }) {
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
  return <section className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">{title && <div className="px-6 py-5"><h2 className="text-sm font-semibold text-[#171717]">{title}</h2>{description && <p className="mt-0.5 text-sm text-[#525252]">{description}</p>}</div>}<div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed text-left text-sm"><thead className="h-11 border-y border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#737373]"><tr>{["Loan ID", "Name", "Amount", ...(forwarded ? [] : ["Submitted by", "Date submitted"]), "Status", "Action"].map(label => <th className="px-6 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(loan => <tr className="h-[72px] border-b border-[#e5e5e5] text-[#404040]" key={`${title}-${loan.id}`}><td className="px-6">{loan.id}</td><td className="px-6">{loan.name}</td><td className="px-6">{loan.amount}</td>{!forwarded && <><td className="px-6">{loan.submittedBy}</td><td className="px-6">{loan.submitted}</td></>}<td className="px-6"><Badge status={loan.status === "Yours" ? "Active" : loan.status} /></td><td className="px-6"><div className="flex justify-end gap-3"><button onClick={() => onView?.(loan)} className={button}><Image src="/credit-analyst/icons/eye.svg" alt="" width={20} height={20} />View</button>{forwarded && ["Active", "Approved"].includes(loan.status) && <button onClick={() => onSurrender?.(loan)} className={button}>↗ Voluntary surrender</button>}</div></td></tr>)}</tbody></table>{rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#737373]">No submissions found.</p>}</div><div className="flex h-16 items-center px-6 text-sm"><span>Page {currentPage} of {pageCount}</span><select className="ml-3 h-9 rounded-lg border border-[#d4d4d4] px-3"><option>5 per page</option></select><button disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} className={`${button} ml-auto disabled:opacity-50`}>Previous</button><button disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className={`${button} ml-3 disabled:opacity-50`}>Next</button></div></section>;
}

function MobileCard({ loan, claimed, forwarded, onClaim, onView: providedOnView, onSurrender }: { loan: Loan; claimed?: boolean; forwarded?: boolean; onClaim?: (loan: Loan) => void; onView?: (loan: Loan) => void; onSurrender?: (loan: Loan) => void }) {
  const onView = providedOnView ?? (forwarded ? (item: Loan) => window.dispatchEvent(new CustomEvent<Loan>("view-forwarded-loan", { detail: item })) : undefined);
  const disabled = loan.status === "Claimed";
  return <article className={`overflow-hidden rounded-xl border border-[#e5e5e5] bg-white ${disabled ? "opacity-50" : ""}`}><div className="p-3"><div className="flex items-start"><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#262626]">{loan.name}</h3><p className="mt-0.5 text-sm text-[#737373]">{loan.id} · {loan.amount}</p>{!forwarded && <p className="mt-1 text-sm text-[#737373]">{loan.submittedBy} · {loan.submitted}</p>}</div><Badge status={loan.status} /></div></div><div className="flex min-h-11 items-center gap-5 border-t border-[#e5e5e5] px-4 text-sm font-semibold"><button onClick={() => onView?.(loan)} className="text-[#be123c]">{claimed ? "Continue investigation" : "View"}</button>{!claimed && !disabled && loan.status === "Open" && <button onClick={() => onClaim?.(loan)} className="text-[#be123c]">Claim</button>}{disabled && <span className="font-normal text-[#525252]">Claimed by M. Reyes</span>}{forwarded && ["Active", "Approved"].includes(loan.status) && <button onClick={() => onSurrender?.(loan)} className="text-[#be123c]">Voluntary surrender</button>}</div></article>;
}

const display = (value?: string) => value?.trim() || "Not provided";

function calculateAge(dateOfBirth?: string) {
  if (!dateOfBirth) return "Not provided";
  const birthday = new Date(dateOfBirth);
  if (Number.isNaN(birthday.getTime())) return "Not provided";
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const beforeBirthday = today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate());
  if (beforeBirthday) age -= 1;
  return String(age);
}

function detailSectionsFor(loan: Loan) {
  const details = loan.details;
  const business = details?.businesses?.[0] ?? {};
  return [
    { title: "Personal information", fields: [["Last name", display(details?.lastName)], ["First name", display(details?.firstName)], ["Middle name", display(details?.middleName)], ["Age", calculateAge(details?.dateOfBirth)], ["Civil status", display(details?.civilStatus)], ["Date of birth", display(details?.dateOfBirth)], ["Citizenship", display(details?.citizenship)], ["Gender", display(details?.gender)], ["Place of birth", display(details?.placeOfBirth)], ["Permanent address", display(details?.permanentAddress)], ["Barangay", display(details?.permanentBarangay)], ["City/Town", display(details?.permanentCityTown)], ["ZIP code", display(details?.permanentZipcode)], ["Region", display(details?.permanentRegion)], ["Present address", display(details?.presentAddress)], ["Number of children", display(details?.numberOfChildren)], ["Contact number", display(details?.contactNumber)], ["Email / Facebook address", display(details?.emailFacebookAddress)]] },
    { title: "Children", fields: (details?.children ?? []).map(child => [display(child.Name), display(child.School), display(child["Grade/Course"]), display(child.Birthday), display(child.Age)]) },
    { title: "Business information", fields: [["Business name", display(business["Business name"])], ["Type", display(business.Type)], ["Address", display(business.Address)], ["Years", display(business.Years)], ["Gross monthly income", display(details?.grossMonthlyIncome)]] },
    { title: "Household information", fields: [["Spouse name", display(details?.spouseName)], ["Occupation", display(details?.spouseOccupation)], ["Age", display(details?.spouseAge)], ["Company", display(details?.spouseCompany)], ["Years", display(details?.spouseYearsEmployed)], ["Monthly income/salary", display(details?.spouseMonthlyIncome)]] },
    { title: "Other information", fields: [["Real and personal properties owned", display(details?.realAndPersonalProperties)], ["Health declaration", display(details?.healthDeclaration)]] },
    { title: "Nearest relative to contact", fields: [["Name", display(details?.relativeName)], ["Contact number", display(details?.relativeContactNumber)], ["Address", display(details?.relativeAddress)]] },
  ];
}

function ReadOnlyField({ label, value, wide = false, className = "" }: { label: string; value: string; wide?: boolean; className?: string }) {
  return <div className={`${wide ? "lg:col-span-12" : ""} ${className}`}><p className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</p><div className="mt-1.5 flex min-h-10 items-center rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 text-base text-[#525252] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">{value}</div></div>;
}

function ReadOnlyRadioGroup({ label, value, options, className = "" }: { label: string; value: string; options: string[]; className?: string }) {
  return <fieldset className={className}><legend className="text-xs font-semibold uppercase leading-[18px] text-[#404040]">{label}</legend><div className={`mt-1.5 grid gap-x-2 gap-y-2 ${options.length > 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>{options.map(option => { const selected = option === value; return <label key={option} className={`flex items-start gap-2 text-sm font-medium leading-5 text-[#404040] ${selected ? "" : "opacity-50"}`}><input type="radio" checked={selected} readOnly disabled aria-label={`${label}: ${option}`} className="sr-only" /><span aria-hidden="true" className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#e11d48]" : "border border-[#d4d4d4] bg-white"}`}>{selected && <span className="size-[6px] rounded-full bg-white" />}</span>{option}</label>; })}</div></fieldset>;
}

function ChildrenTable({ fields }: { fields: string[][] }) {
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Children</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white"><div className="grid grid-cols-[1.15fr_1.45fr_1fr_1fr_.55fr] bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Name</span><span>School</span><span>Grade/Course</span><span>Birthday</span><span>Age</span></div>{fields.length ? fields.map((row, index) => <div key={index} className="grid min-h-[64px] grid-cols-[1.15fr_1.45fr_1fr_1fr_.55fr] items-center border-t border-[#e5e5e5] px-4 text-sm text-[#525252]">{row.map((value, fieldIndex) => <span key={fieldIndex}>{value}</span>)}</div>) : <p className="border-t border-[#e5e5e5] px-4 py-5 text-sm text-[#737373]">No children were added to this application.</p>}</div></section>;
}

function BusinessTable({ fields }: { fields: string[][] }) {
  const value = (label: string) => fields.find(([fieldLabel]) => fieldLabel === label)?.[1] ?? "—";
  return <section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Business information</h2><div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white"><div className="grid grid-cols-[1.35fr_1fr_1.35fr_.5fr] bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#737373]"><span>Business name</span><span>Type</span><span>Address</span><span>Years</span></div><div className="grid min-h-[64px] grid-cols-[1.35fr_1fr_1.35fr_.5fr] items-center border-t border-[#e5e5e5] px-4 text-sm text-[#525252]"><span>{value("Business name")}</span><span>{value("Type")}</span><span>{value("Address")}</span><span>{value("Years")}</span></div></div><div className="mt-6 grid grid-cols-2 gap-6"><ReadOnlyField label="Gross monthly income" value={value("Gross monthly income")} /></div></section>;
}

function DesktopDetailSection({ title, fields }: { title: string; fields: string[][] }) {
  if (title === "Children") return <ChildrenTable fields={fields} />;
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

function SubmissionDetail({ loan, onBack, onClaim }: { loan: Loan; onBack: () => void; onClaim: (loan: Loan) => Promise<ClaimLoanResult> }) {
  const detailSections = detailSectionsFor(loan);
  const documents = loan.details?.supportingDocuments ?? [];
  const primaryBusiness = loan.details?.businesses?.[0];
  const businessName = display(primaryBusiness?.["Business name"]);
  const businessType = display(primaryBusiness?.Type);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    setClaimError("");
    try {
      const result = await onClaim(loan);
      if (!result.success) setClaimError(result.error);
    } catch {
      setClaimError("Unable to claim this submission right now. Please try again.");
    } finally {
      setClaiming(false);
    }
  };
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
  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]"><div className="border-b border-[#e5e5e5] px-4 lg:hidden"><button type="button" onClick={onBack} className="flex h-14 items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />{loan.id}</button></div><header className="px-4 pb-6 pt-6 lg:px-8 lg:pb-8 lg:pt-8"><div className="mx-auto max-w-[1096px]"><button type="button" onClick={onBack} className="relative z-10 hidden min-h-5 cursor-pointer items-center gap-1 text-sm font-semibold leading-5 text-[#525252] lg:inline-flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={20} height={20} />Back to open submissions</button><div className="mt-0 flex items-center gap-2 lg:mt-4"><h1 className="text-xl font-semibold leading-[30px] text-[#171717]">{loan.id} <span className="hidden text-[#171717] lg:inline">— {loan.name}</span></h1><Badge status="Open" /></div><h2 className="mt-5 text-lg font-semibold text-[#171717] lg:hidden">{loan.name}</h2><p className="mt-1 text-sm text-[#737373] lg:text-base lg:text-[#525252]">Submitted {loan.submitted} by {loan.submittedBy} · Caloocan Branch</p><div className="mt-3 rounded-xl border border-[#fca5a5] bg-[#fee2e2] p-3 text-sm leading-5 text-[#dc2626] lg:mt-5 lg:flex lg:items-center lg:gap-3"><Image src="/credit-analyst/icons/lock.svg" alt="" width={20} height={20} className="hidden lg:block" />This submission is unclaimed. Claim it to begin your investigation and unlock notes, documents, and the investigation, cash flow, collateral, and disclosure pages.</div></div></header><div className="px-4 pb-28 lg:px-8"><div className="mx-auto max-w-[1096px] rounded-xl border border-[#e5e5e5] bg-white lg:p-6"><div className="lg:hidden"><h2 className="text-xs font-semibold uppercase text-[#404040]">Application — read only</h2><dl className="mt-3 border-l-2 border-[#d4d4d4] bg-[#fafafa] p-3 text-sm"><div className="flex py-1"><dt className="text-[#737373]">Name</dt><dd className="ml-auto font-semibold">{loan.name}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Loan applied</dt><dd className="ml-auto font-semibold">{loan.amount}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Business</dt><dd className="ml-auto font-semibold">{businessName} · {businessType}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Gross monthly</dt><dd className="ml-auto font-semibold">{display(loan.details?.grossMonthlyIncome)}</dd></div><div className="flex py-1"><dt className="text-[#737373]">Documents</dt><dd className="ml-auto font-semibold">{documents.length} files</dd></div></dl><h2 className="mt-7 text-xs font-semibold uppercase text-[#404040]">Locked until claimed</h2><div className="mt-3 space-y-3">{["Investigation report", "Cash flow analysis", "Collateral analysis", "Disclosure statement"].map(section => <div key={section} className="flex h-16 items-center rounded-xl border border-[#e5e5e5] px-4 text-[#a3a3a3]"><span className="mr-3 flex size-9 items-center justify-center rounded-full bg-[#fafafa]"><Image src="/credit-analyst/icons/lock.svg" alt="" width={16} height={16} /></span><span>{section}</span><span className="ml-auto text-2xl">›</span></div>)}</div></div><div className="hidden space-y-8 lg:block">{detailSections.map(section => <DesktopDetailSection key={section.title} {...section} />)}<section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Loan details</h2><div className="mt-6 grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value={loan.product || "Not provided"} /><ReadOnlyField label="Loan amount" value={loan.amount} /><ReadOnlyField label="Term" value={loan.term} /></div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Supporting documents</h2><div className="mt-6 space-y-3">{documents.length ? documents.map(({ name, size }) => <div key={name} className="flex h-[74px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium text-[#404040]">{name}</p><p className="mt-0.5 text-sm text-[#525252]">{size} · Uploaded {loan.submitted}</p></div></div>) : <p className="text-sm text-[#737373]">No supporting documents were attached.</p>}</div></section></div></div></div><div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] flex-col items-end gap-2"><p aria-live="polite" className="text-sm text-[#b91c1c]">{claimError}</p><button type="button" disabled={claiming} onClick={handleClaim} className="h-9 w-full rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] disabled:cursor-wait disabled:opacity-60 lg:w-auto">{claiming ? "Claiming…" : "Claim submission"}</button></div></div></div>;
}

const analysisPageDefinitions: { id: AnalysisPage; title: string; detail: string }[] = [
  { id: "investigation", title: "Investigation report", detail: "Recommended ₱65,000 · 1 undisclosed loan" },
  { id: "cashflow", title: "Cash flow analysis", detail: "Net ₱26,000 · capacity ₱9,100" },
  { id: "collateral", title: "Collateral analysis", detail: "No items recorded" },
  { id: "disclosure", title: "Disclosure statement", detail: "Auto-computed · needs a term" },
];

function ForwardApprovalModal({ loan, recommendedAmount, onClose, onForward }: { loan: Loan; recommendedAmount: string; onClose: () => void; onForward: (remarks: string) => Promise<ForwardLoanResult> }) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amount = Number(recommendedAmount.replace(/[^0-9.-]/g, "")) || 65000;
  const netProceeds = amount - amount * .18 - 600 - 400;
  const formatMoney = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const handleForward = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await onForward(remarks);
      if (!result.success) setError(result.error);
    } catch {
      setError("Unable to forward this submission right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
          <textarea maxLength={5000} value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add a note for the Branch Manager" className="mt-2 h-10 w-full resize-none rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] lg:h-[116px] lg:py-3" />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-[#b91c1c]">{error}</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3">
        <button onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] lg:order-none"><span className="lg:hidden">Go back</span><span className="hidden lg:inline">Cancel</span></button>
        <button disabled={saving} onClick={() => void handleForward()} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] disabled:cursor-wait disabled:opacity-60">{saving ? "Forwarding…" : "Forward for approval"}</button>
      </div>
    </div>
  </div>;
}

function RejectApplicationModal({ loan, step, onClose, onContinue, onRejected }: { loan: Loan; step: 1 | 2; onClose: () => void; onContinue: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState("Undisclosed existing loan");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reasons = ["Undisclosed existing loan", "Insufficient debt capacity", "Business could not be verified", "Other"];
  const shell = "relative w-full rounded-t-2xl bg-white shadow-2xl lg:max-w-[640px] lg:rounded-2xl";
  const closeButton = <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg lg:right-4 lg:top-4"><Image src="/credit-analyst/icons/x-close.svg" alt="" width={20} height={20} /></button>;
  const continueOrReject = async () => {
    if (step === 1) {
      onContinue();
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await rejectCreditInvestigation(loan.databaseId, reason, detail);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onRejected();
    } catch {
      setError("Unable to reject this application right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const reasonPanel = <div className={shell}>
    {closeButton}
    <div className="px-4 pb-5 pt-6 lg:px-6 lg:pb-5"><h2 className="pr-10 text-lg font-semibold text-[#be123c] lg:text-base lg:text-[#171717]">Reason for rejection</h2><p className="mt-5 text-sm leading-5 text-[#525252] lg:mt-1">Select why {loan.id} — {loan.name} is being rejected.</p>
      <fieldset className="mt-5"><legend className="text-sm font-medium text-[#404040]">Reason <span className="ml-1 text-[#be123c]"><span className="hidden lg:inline">*</span><span className="lg:hidden">Required</span></span></legend><div className="mt-3 space-y-3">{reasons.map(item => <label key={item} className={`flex items-center gap-3 text-sm ${item === reason ? "text-[#404040]" : "text-[#525252] lg:text-[#a3a3a3]"}`}><input type="radio" name="rejection-reason" value={item} checked={reason === item} onChange={() => setReason(item)} className="size-4 accent-[#e11d48]" />{item}</label>)}</div></fieldset>
      <label className="mt-5 block text-sm font-medium text-[#404040]"><span className="hidden lg:inline">Additional detail (optional)</span><textarea maxLength={5000} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Add detail for the credit analyst…" className="mt-2 h-[72px] w-full resize-none rounded-lg border border-[#d4d4d4] px-3 py-3 text-sm outline-none placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] lg:h-[116px]" /></label>
      {error && <p role="alert" className="mt-3 text-sm text-[#b91c1c]">{error}</p>}
    </div>
    <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3"><button disabled={saving} onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] disabled:opacity-60 lg:order-none">Go back</button><button disabled={saving} onClick={() => void continueOrReject()} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{saving ? "Rejecting…" : "Reject application"}</button></div>
  </div>;
  const confirmPanel = <div className={shell}>
    {closeButton}
    <div className="px-4 pb-5 pt-6 lg:px-6 lg:pb-5"><h2 className="pr-10 text-lg font-semibold text-[#be123c] lg:text-base lg:text-[#171717]">Reject this application?</h2><p className="mt-5 text-sm font-semibold leading-5 text-[#be123c] lg:mt-1 lg:font-normal lg:text-[#525252]">{loan.id} — {loan.name} will be rejected and returned to the Credit Analyst. This cannot be undone.</p><p className="mt-5 hidden text-sm font-semibold text-[#be123c] lg:block">This is permanent.</p><p className="mt-4 text-sm leading-5 text-[#525252]">Rejected applications cannot be reopened or resubmitted — a new application would need to start from scratch. Make sure you&apos;ve verified everything before continuing.</p>{error && <p role="alert" className="mt-3 text-sm text-[#b91c1c]">{error}</p>}</div>
    <div className="flex flex-col gap-3 border-t border-[#e5e5e5] px-4 py-4 lg:flex-row lg:px-6 lg:pb-6 lg:pt-3"><button disabled={saving} onClick={onClose} className="order-2 h-10 flex-1 rounded-lg border border-[#d4d4d4] text-sm font-semibold text-[#404040] disabled:opacity-60 lg:order-none">Cancel</button><button disabled={saving} onClick={() => void continueOrReject()} className="h-10 flex-1 rounded-lg bg-[#e11d48] text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{saving ? "Rejecting…" : "Continue"}</button></div>
  </div>;

  return <div role="dialog" aria-modal="true" aria-label="Reject application" className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:px-8 lg:py-8"><button aria-label="Close rejection dialog" className="absolute inset-0 cursor-default bg-[#0a0a0a]/70 backdrop-blur-[8px]" onClick={onClose} /><div className="contents lg:hidden">{step === 1 ? confirmPanel : reasonPanel}</div><div className="hidden lg:contents">{step === 1 ? reasonPanel : confirmPanel}</div></div>;
}

function SurrenderedItemRow({
  item,
  saved,
  onChange,
  onRemove,
}: {
  item: SurrenderItem;
  saved: boolean;
  onChange?: (key: keyof SurrenderItem, value: string) => void;
  onRemove?: () => void;
}) {
  const inputClass = `mt-2 h-10 w-full rounded-lg border px-3 text-sm font-normal normal-case outline-none ${saved
    ? "border-[#e5e5e5] bg-[#fafafa] text-[#525252]"
    : "border-[#d4d4d4] bg-white placeholder:text-[#a3a3a3] focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]"
  }`;
  const fields: Array<{ key: keyof SurrenderItem; label: string; placeholder: string }> = [
    { key: "description", label: "Item description", placeholder: "e.g. Motorcycle, Car" },
    { key: "model", label: "Model/Brand", placeholder: "Model/Make" },
    { key: "serial", label: "Engine/Serial no.", placeholder: "VIN" },
    { key: "rate", label: "Rate", placeholder: "₱0.00" },
  ];

  return <div>
    <div className="hidden grid-cols-[1.8fr_.8fr_.8fr_1.1fr_auto] gap-5 rounded-xl border border-[#e5e5e5] p-4 lg:grid">
      {fields.map(field => <label key={field.key} className="text-[11px] font-semibold uppercase text-[#737373]">{field.label}<input className={inputClass} value={item[field.key]} readOnly={saved} onChange={saved ? undefined : event => onChange?.(field.key, event.target.value)} inputMode={field.key === "rate" ? "decimal" : undefined} placeholder={field.placeholder} /></label>)}
      {saved
        ? <span className="mt-7 inline-flex h-7 items-center rounded-full border border-[#d4d4d4] bg-[#fafafa] px-2 text-xs font-semibold text-[#525252]">Saved</span>
        : <button onClick={onRemove} aria-label="Delete item" className="mt-7 flex size-10 items-center justify-center"><Image src="/credit-analyst/icons/trash-analysis.svg" alt="" width={16} height={16} /></button>}
    </div>
    {saved
      ? <div className="flex min-h-[68px] items-center rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 lg:hidden"><div><div className="flex items-center gap-2"><p className="font-medium">{item.description || "Item"}</p><span className="rounded-full border border-[#d4d4d4] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#737373]">Saved</span></div><p className="mt-1 text-sm text-[#737373]">{item.model || "Model"} · {item.serial || "Serial no."} · {item.rate ? `₱${Number(item.rate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "₱0.00"}</p></div></div>
      : <div className="space-y-3 rounded-xl border border-[#e5e5e5] p-3 lg:hidden">{fields.map(field => <label key={field.key} className="block text-[11px] font-semibold uppercase text-[#737373]">{field.label}<input className={inputClass} value={item[field.key]} onChange={event => onChange?.(field.key, event.target.value)} inputMode={field.key === "rate" ? "decimal" : undefined} placeholder={field.placeholder} /></label>)}<button onClick={onRemove} className="flex h-9 items-center gap-2 text-sm font-semibold text-[#be123c]"><Image src="/credit-analyst/icons/trash-analysis.svg" alt="" width={16} height={16} />Remove item</button></div>}
  </div>;
}

function VoluntarySurrenderScreen({ loan, onBack, onSaved }: { loan: Loan; onBack: () => void; onSaved: (items: SurrenderItem[]) => void }) {
  const currentItems = loan.surrenderedItems ?? [];
  const [items, setItems] = useState<SurrenderItem[]>([]);
  const [attestation, setAttestation] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const updateItem = (index: number, key: keyof SurrenderItem, value: string) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const addItem = () => setItems(current => [...current, { description: "", model: "", serial: "", rate: "" }]);
  const attestations = ["The turn-over of the unit/s was conducted in an orderly manner without the use of force upon any person/s or property.", "The representative/s of QVDS left the client's domicile without taking any property not subject to seizure.", "This statement was made freely and voluntarily, without the use of force, threat, or intimidation.", "Before signing, the contents of this statement were translated into a language known to the client, and understood by them."];
  const submitSurrender = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.set("loanId", loan.databaseId);
      formData.set("investigationId", loan.investigationId ?? "");
      formData.set("items", JSON.stringify([...currentItems, ...items]));
      if (attestation) formData.set("attestation", attestation);
      const result = await saveVoluntarySurrender(formData);
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      onSaved([...currentItems, ...items]);
    } catch {
      setSaveError("Unable to save the voluntary surrender right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]"><header className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4 lg:hidden"><button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Voluntary surrender</button><button onClick={onBack} className="text-sm font-semibold text-[#be123c]">Cancel</button></header><main className="mx-auto max-w-[1160px] px-4 pb-28 pt-6 lg:px-8 lg:pb-24 lg:pt-8"><button onClick={onBack} className="hidden items-center gap-1 text-sm font-semibold text-[#525252] lg:flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Back to {loan.id} — {loan.name}</button><div className="mt-0 lg:mt-5"><div className="flex items-start justify-between lg:justify-start lg:gap-2"><div><h1 className="text-xl font-semibold lg:text-lg"><span className="lg:hidden">{loan.name}</span><span className="hidden lg:inline">Voluntary surrender of unit</span></h1><p className="mt-1 text-sm text-[#737373] lg:hidden">{loan.id} · {loan.amount}</p></div><span className="inline-flex rounded-full border border-[#7dd3fc] bg-[#f0f9ff] px-2 py-1 text-xs text-[#0369a1]"><span className="mr-1">●</span>{loan.status} loan</span></div><p className="mt-5 max-w-[620px] text-base leading-6 text-[#525252] lg:mt-1 lg:text-sm">Record items voluntarily surrendered due to inability to pay the daily installment.</p></div><div className="mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:p-6"><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Surrendered items</h2><div className="mt-3 space-y-3 lg:mt-6">{currentItems.map((item, index) => <SurrenderedItemRow key={`saved-${index}`} item={item} saved />)}{items.map((item, index) => <SurrenderedItemRow key={`new-${index}`} item={item} saved={false} onChange={(key, value) => updateItem(index, key, value)} onRemove={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} />)}{currentItems.length === 0 && items.length === 0 && <p className="rounded-xl border border-dashed border-[#d4d4d4] px-4 py-6 text-center text-sm text-[#737373]">No surrendered items recorded yet.</p>}</div><button onClick={addItem} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#d4d4d4] text-sm font-semibold text-[#737373] lg:w-auto lg:border-solid lg:px-4"><Image src="/credit-analyst/icons/plus.svg" alt="" width={16} height={16} />Add item</button></section><section className="mt-7"><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Attestation</h2><div className="mt-3 rounded-lg bg-[#fafafa] p-3 lg:mt-6 lg:rounded-xl lg:border lg:border-[#e5e5e5] lg:bg-white">{attestations.map(text => <p key={text} className="mb-3 flex text-sm leading-5 text-[#737373] last:mb-0 lg:text-[#525252]"><span className="mr-2 text-[#e11d48] lg:font-semibold">{`•`}</span>{text}</p>)}</div><p className="mt-4 rounded-xl border border-[#fb7185] px-3 py-3 text-sm font-semibold leading-5 text-[#be123c] lg:border-0 lg:bg-[#fee2e2]">Signed on paper by the client and the QVDS representative. Attach the signed copy below<span className="hidden lg:inline"> — the record is incomplete without it.</span></p><h3 className="mt-5 hidden border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040] lg:block">Signed attestation</h3><label className="mt-3 flex h-[78px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#d4d4d4] text-sm font-semibold text-[#525252] lg:h-[126px]"><input type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => setAttestation(event.target.files?.[0] ?? null)} />{attestation ? <><span>{attestation.name}</span><span className="mt-1 text-xs font-normal text-[#737373]">Click to replace</span></> : <><Image src="/credit-analyst/icons/camera.svg" alt="" width={22} height={22} className="hidden lg:block" /><span className="lg:mt-2"><span className="lg:hidden">Photograph signed attestation</span><span className="hidden text-[#be123c] lg:inline">Click to upload</span><span className="hidden font-normal lg:inline"> or take a photo</span></span><span className="mt-1 text-xs font-normal text-[#a3a3a3]">PNG, JPG (max. 5MB)</span></>}</label>{saveError && <p role="alert" className="mt-4 rounded-lg border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{saveError}</p>}</section></div></main><footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] justify-end gap-3"><button disabled={saving} onClick={onBack} className="hidden h-10 rounded-lg border border-[#d4d4d4] px-4 text-sm font-semibold text-[#404040] disabled:opacity-60 lg:block">Cancel</button><button disabled={saving} onClick={() => void submitSurrender()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 lg:w-auto"><Image src="/credit-analyst/icons/save-analysis.svg" alt="" width={16} height={16} className="hidden lg:block" />{saving ? "Saving…" : "Save voluntary surrender"}</button></div></footer></div>;
}

function ClaimedSubmissionDetail({ loan, onBack, onForwarded, onRejected, readOnly = false, forwardedView = false }: { loan: Loan; onBack: () => void; onForwarded?: () => void; onRejected?: () => void; readOnly?: boolean; forwardedView?: boolean }) {
  const loanDetailSections = detailSectionsFor(loan);
  const applicantSections = loanDetailSections.filter(section => section.title !== "Children");
  const childFields = loanDetailSections.find(section => section.title === "Children")?.fields ?? [];
  const documents = loan.details?.supportingDocuments ?? [];
  const primaryBusiness = loan.details?.businesses?.[0];
  const [analysisPage, setAnalysisPage] = useState<AnalysisPage | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData>(() => loan.analysisData ? {
    ...defaultAnalysisData,
    ...loan.analysisData,
    incomes: { ...defaultAnalysisData.incomes, ...loan.analysisData.incomes },
    expenses: { ...defaultAnalysisData.expenses, ...loan.analysisData.expenses },
  } : defaultAnalysisData);
  const [investigationId, setInvestigationId] = useState<string | null>(loan.investigationId ?? null);
  const [completedAnalyses, setCompletedAnalyses] = useState<AnalysisPage[]>(forwardedView
    ? ["investigation", "cashflow", "collateral", "disclosure"]
    : loan.completedAnalyses ?? []);
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
  const saveAnalysis = async (page: AnalysisPage): Promise<AnalysisSaveResult> => {
    if (page === "investigation") {
      const result = await saveInvestigationReport(loan.databaseId, {
        ...analysisData,
        businessName: primaryBusiness?.["Business name"] ?? "",
      });
      if (!result.success) return result;
      setInvestigationId(result.investigationId);
    } else if (page === "collateral") {
      const result = await saveCollateralAnalysis(
        loan.databaseId,
        analysisData.collateral,
        investigationId ?? undefined,
      );
      if (!result.success) return result;
      setInvestigationId(result.investigationId);
    }
    setCompletedAnalyses(current => current.includes(page) ? current : [...current, page]);
    return { success: true };
  };
  if (analysisPage) return <><div className={readOnly ? "[&_footer]:hidden" : ""}><AnalysisWorkspace page={analysisPage} loanId={loan.id} applicant={loan.name} data={analysisData} setData={readOnly ? () => undefined : setAnalysisData} completed={completedAnalyses} onSave={readOnly ? async () => ({ success: true }) : saveAnalysis} onBack={() => setAnalysisPage(null)} onNavigate={setAnalysisPage} onReject={() => setRejectStep(1)} cashFlowReadOnly readOnlyMode={readOnly} /></div>{!readOnly && rejectStep !== 0 && <RejectApplicationModal loan={loan} step={rejectStep} onClose={() => setRejectStep(0)} onContinue={() => setRejectStep(2)} onRejected={() => { setRejectStep(0); onRejected?.(); }} />}</>;
  return <div className="min-h-screen bg-white text-[#171717] lg:ml-[280px]">
    <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] px-4 lg:hidden"><button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#525252]"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />{loan.id}</button>{!readOnly && <button className="text-sm font-semibold text-[#be123c]">Release</button>}</div>
    <main className="mx-auto max-w-[1144px] px-4 pb-32 pt-6 lg:px-6 lg:pb-24 lg:pt-8">
      <button onClick={onBack} className="hidden items-center gap-1 text-sm font-semibold text-[#525252] lg:flex"><Image src="/credit-analyst/icons/arrow-left.svg" alt="" width={18} height={18} />Back to {forwardedView ? "forwarded" : "my submissions"}</button>
      <div className="lg:mt-4"><div className="flex items-center gap-2"><h1 className="text-base font-medium text-[#171717] lg:text-xl lg:font-semibold">{loan.id}<span className="hidden text-[#171717] lg:inline"> — {loan.name}</span></h1><span className="hidden lg:inline-flex"><Badge status={loan.status} /></span></div><h2 className="mt-0 text-base font-medium text-[#171717] lg:hidden">{loan.name}</h2><p className="mt-1 text-xs text-[#737373] lg:text-sm lg:text-[#525252]">Submitted {loan.submitted} by {loan.submittedBy} · Caloocan Branch</p></div>
      <section className="mt-6 lg:hidden"><h2 className="border-b border-[#e5e5e5] pb-2 text-xs font-semibold uppercase text-[#404040]">Application — read only</h2><dl className="mt-3 space-y-2 border-l-2 border-[#d4d4d4] bg-[#fafafa] p-3 text-sm"><div className="flex justify-between"><dt className="text-[#737373]">Loan applied</dt><dd className="font-medium">{loan.amount}</dd></div><div className="flex justify-between"><dt className="text-[#737373]">Declared business</dt><dd className="font-medium">{display(primaryBusiness?.["Business name"])}</dd></div><div className="flex justify-between"><dt className="text-[#737373]">Declared income</dt><dd className="font-medium">{display(loan.details?.grossMonthlyIncome)} / mo</dd></div></dl><button className="mt-3 text-sm font-semibold text-[#be123c]">View full application</button></section>
      <section className="mt-7 lg:mt-3"><div className="hidden flex-wrap gap-2 lg:flex">{analysisPages.map(page => <button key={page.title} className="flex h-8 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#525252] shadow-sm">{page.title}{page.done && <Image src="/credit-analyst/icons/check-circle.svg" alt="Complete" width={16} height={16} />}</button>)}</div><div className="lg:hidden"><div className="flex justify-between text-xs text-[#525252]"><span>2 of 4 analysis pages complete</span><span>50%</span></div><div className="mt-1 h-2 rounded-full bg-[#e5e5e5]"><div className="h-2 w-[57.5%] rounded-full bg-[#e11d48]" /></div><div className="mt-6 space-y-3">{analysisPages.map((page, index) => <button key={page.title} className={`flex min-h-[70px] w-full items-center rounded-xl border p-4 text-left ${page.active ? "border-[#f59e0b]" : "border-[#e5e5e5]"} ${index === 3 ? "opacity-50" : ""}`}><span className={`mr-3 flex size-8 shrink-0 items-center justify-center rounded-full ${page.done ? "bg-[#dcfce7] text-[#16a34a]" : page.active ? "bg-[#fef9c3] text-[#d97706]" : "bg-[#fafafa] text-[#a3a3a3]"}`}>{page.done ? <Image src="/credit-analyst/icons/check-circle.svg" alt="Complete" width={16} height={16} /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#525252]">{page.title}</span><span className="block text-xs text-[#737373]">{page.detail}</span></span>{page.active ? <span className="rounded-full border border-[#fde047] bg-[#fefce8] px-2 py-1 text-xs text-[#a16207]">In progress</span> : <span className="text-2xl text-[#a3a3a3]">›</span>}</button>)}</div><div className="mt-3 rounded-xl border border-[#fca5a5] bg-[#fee2e2] p-3 text-sm leading-5 text-[#dc2626]"><strong>1 undisclosed lending found.</strong> Policy requires review when the applicant did not declare an existing loan. Review before forwarding.</div></div></section>
      <div className="mt-6 hidden rounded-xl border border-[#e5e5e5] bg-white p-6 lg:block"><div className="space-y-8">{applicantSections.slice(0, 1).map(section => <DesktopDetailSection key={section.title} {...section} />)}<ChildrenTable fields={childFields} />{applicantSections.slice(1).map(section => <DesktopDetailSection key={section.title} {...section} />)}<section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Loan details</h2><div className="mt-6 grid grid-cols-3 gap-6"><ReadOnlyField label="Loan product" value={loan.product || "Not provided"} /><ReadOnlyField label="Loan amount" value={loan.amount} /><ReadOnlyField label="Term" value={loan.term} /></div></section><section><h2 className="border-b border-[#e5e5e5] pb-2 text-sm font-semibold uppercase text-[#404040]">Supporting documents</h2><div className="mt-6 space-y-3">{documents.length ? documents.map(({ name, size }) => <div key={name} className="flex h-[74px] items-center rounded-xl border border-[#e5e5e5] px-4"><Image src="/credit-analyst/icons/file.svg" alt="" width={20} height={20} /><div className="ml-3"><p className="text-sm font-medium">{name}</p><p className="text-xs text-[#737373]">{size} · Uploaded {loan.submitted}</p></div></div>) : <p className="text-sm text-[#737373]">No supporting documents were attached.</p>}</div></section></div></div>
    </main>
    {!readOnly && <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white p-4 lg:left-[280px] lg:px-8"><div className="mx-auto flex max-w-[1096px] flex-col gap-3 lg:flex-row lg:items-center"><button className="order-2 h-9 rounded-lg border border-[#e11d48] px-4 text-sm font-semibold text-[#be123c] lg:order-none">Reject application</button><div className="ml-auto hidden gap-3 lg:flex"><button className={button}>Release submission</button><button className={button}>Back</button><button className="h-9 rounded-lg bg-[#e11d48] px-5 text-sm font-semibold text-white">Forward for approval</button></div><button disabled className="h-9 rounded-lg border border-[#e5e5e5] text-sm font-semibold text-[#a3a3a3] lg:hidden">Forward for approval</button></div></footer>}
    {!readOnly && forwardOpen && <ForwardApprovalModal loan={loan} recommendedAmount={analysisData.recommendedAmount} onClose={() => setForwardOpen(false)} onForward={async remarks => { const result = await forwardLoanForApproval(loan.databaseId, remarks); if (result.success) { setForwardOpen(false); onForwarded?.(); } return result; }} />}
    {!readOnly && rejectStep !== 0 && <RejectApplicationModal loan={loan} step={rejectStep} onClose={() => setRejectStep(0)} onContinue={() => setRejectStep(2)} onRejected={() => { setRejectStep(0); onRejected?.(); }} />}
  </div>;
}

export default function CreditInvestigatorApp({ userProfile, initialLoans, loadError }: { userProfile: UserProfileIdentity; initialLoans: Loan[]; loadError?: string }) {
  const [tab, setTab] = useState<Tab>("review"); const [menuOpen, setMenuOpen] = useState(false); const [query, setQuery] = useState(""); const [status, setStatus] = useState("All"); const [availableLoans, setAvailableLoans] = useState<Loan[]>(() => initialLoans.filter(loan => loan.claimStatus === "open").map(loan => ({ ...loan, status: "Open" }))); const [myLoans, setMyLoans] = useState<Loan[]>(() => initialLoans.filter(loan => loan.claimStatus === "claimed").map(loan => ({ ...loan, status: loan.decisionStatus }))); const [selectedLoan, setSelectedLoan] = useState<{ loan: Loan; source: "open" | "claimed" | "forwarded" } | null>(null); const [surrenderLoan, setSurrenderLoan] = useState<Loan | null>(null);
  const forwardedLoans = useMemo(
    () => myLoans
      .filter(loan => isForwardedStatus(loan.decisionStatus))
      .map(loan => ({ ...loan, status: loan.decisionStatus })),
    [myLoans],
  );
  const match = (loan: Loan) => `${loan.id} ${loan.name}`.toLowerCase().includes(query.toLowerCase()) && (status === "All" || loan.status === status);
  const open = availableLoans.filter(match);
  const claimed = myLoans.filter(loan => !isForwardedStatus(loan.decisionStatus)).filter(match);
  const forwarded = forwardedLoans.filter(match);
  useEffect(() => {
    const viewForwarded = (event: Event) => setSelectedLoan({ loan: (event as CustomEvent<Loan>).detail, source: "forwarded" });
    window.addEventListener("view-forwarded-loan", viewForwarded);
    return () => window.removeEventListener("view-forwarded-loan", viewForwarded);
  }, []);
  const claimLoan = async (loan: Loan): Promise<ClaimLoanResult> => { const result = await claimLoanSubmission(loan.databaseId); if (!result.success) return result; const claimedLoan: Loan = { ...loan, claimStatus: "claimed", status: loan.decisionStatus }; setAvailableLoans(current => current.filter(item => item.id !== loan.id)); setMyLoans(current => current.some(item => item.id === loan.id) ? current.map(item => item.id === loan.id ? claimedLoan : item) : [claimedLoan, ...current]); return result; };
  const navigate = (target: Tab) => { setTab(target); setMenuOpen(false); setQuery(""); setStatus("All"); };
  if (surrenderLoan) return <><InvestigatorDesktopNavigation active="forwarded" mobileOpen={false} userProfile={userProfile} onClose={() => undefined} onNavigate={navigate} /><VoluntarySurrenderScreen loan={surrenderLoan} onBack={() => setSurrenderLoan(null)} onSaved={items => { setMyLoans(current => current.map(loan => loan.databaseId === surrenderLoan.databaseId ? { ...loan, surrenderedItems: items } : loan)); setSurrenderLoan(null); }} /></>;
  if (selectedLoan) { const isForwarded = selectedLoan.source === "forwarded"; const isRejected = selectedLoan.loan.decisionStatus === "Rejected"; const isClaimed = isForwarded || selectedLoan.source === "claimed" || selectedLoan.loan.status === "Claimed" || selectedLoan.loan.status === "Yours"; return <><InvestigatorDesktopNavigation active={isForwarded ? "forwarded" : "review"} mobileOpen={false} userProfile={userProfile} onClose={() => undefined} onNavigate={navigate} />{isClaimed ? <ClaimedSubmissionDetail loan={selectedLoan.loan} onBack={() => setSelectedLoan(null)} onForwarded={() => { setMyLoans(current => current.map(item => item.id === selectedLoan.loan.id ? { ...item, status: "Active", decisionStatus: "Active" } : item)); setSelectedLoan(null); }} onRejected={() => { setMyLoans(current => current.map(item => item.id === selectedLoan.loan.id ? { ...item, status: "Rejected", decisionStatus: "Rejected" } : item)); setSelectedLoan(null); }} readOnly={isForwarded || isRejected} forwardedView={isForwarded} /> : <SubmissionDetail loan={selectedLoan.loan} onBack={() => setSelectedLoan(null)} onClaim={async loan => { const result = await claimLoan(loan); if (result.success) setSelectedLoan(null); return result; }} />}</>; }
  return <div className="min-h-screen bg-white text-[#171717]"><InvestigatorDesktopNavigation active={tab} mobileOpen={menuOpen} userProfile={userProfile} onClose={() => setMenuOpen(false)} onNavigate={navigate} /><MobileHeader onOpen={() => setMenuOpen(true)} /><InvestigatorMobileNavigation active={tab} mobileOpen={menuOpen} userProfile={userProfile} onClose={() => setMenuOpen(false)} onNavigate={navigate} /><main className="lg:ml-[280px]"><div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 lg:px-8 lg:pt-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-start"><div className="flex-1"><h1 className="text-2xl font-semibold leading-8 lg:text-xl lg:leading-[30px]">{tab === "review" ? "Submissions to review" : "Forwarded"}</h1>{tab === "forwarded" && <p className="mt-2 max-w-[440px] text-base leading-6 text-[#525252]">Loans you&apos;ve forwarded for approval — track their outcome and initiate voluntary surrender if needed.</p>}</div><div className="flex gap-3"><Search value={query} onChange={setQuery} /><select value={status} onChange={event => setStatus(event.target.value)} className="hidden h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:block"><option>All</option>{["Open", "Claimed", "Active", "Approved", "Pending", "Rejected", "Inactive"].map(value => <option key={value}>{value}</option>)}</select></div></div>{tab === "forwarded" && <div className="mt-3 flex gap-1 lg:hidden"><button onClick={() => navigate("review")} className="h-9 px-3 text-sm font-semibold text-[#737373]">To review</button><button className="h-9 rounded-lg border border-[#e11d48] bg-[#fff1f2] px-3 text-sm font-semibold text-[#be123c]">Forwarded</button></div>}{loadError && <div role="alert" className="mt-6 rounded-lg border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">{loadError}</div>}<div className="mt-8 hidden space-y-6 lg:block">{tab === "review" ? <><Table title="Open Submissions" description="Unclaimed — available for any investigator to review" loans={open} onView={loan => setSelectedLoan({ loan, source: "open" })} /><Table title="My submissions" description="Claimed by you — review and forward or reject" loans={claimed} onView={loan => setSelectedLoan({ loan, source: "claimed" })} /></> : <Table loans={forwarded} forwarded onSurrender={setSurrenderLoan} />}</div><div className="mt-8 space-y-7 lg:hidden">{tab === "review" ? <><section><h2 className="mb-3 text-xs font-semibold uppercase text-[#525252]">Claimed by you · {claimed.length}</h2><div className="space-y-3">{claimed.map(loan => <MobileCard key={loan.id} loan={loan} claimed onView={item => setSelectedLoan({ loan: item, source: "claimed" })} />)}{claimed.length === 0 && <p className="text-sm text-[#737373]">No claimed submissions found.</p>}</div></section><section><h2 className="text-xs font-semibold uppercase text-[#525252]">Open submissions · {open.length}</h2><p className="mb-3 mt-2 text-base text-[#525252]">Unclaimed — available for any investigator.</p><div className="space-y-3">{open.map(loan => <MobileCard key={loan.id} loan={loan} onClaim={claimLoan} onView={item => setSelectedLoan({ loan: item, source: "open" })} />)}{open.length === 0 && <p className="text-sm text-[#737373]">No open submissions found.</p>}</div></section></> : <div className="space-y-3">{forwarded.map(loan => <MobileCard key={loan.id} loan={loan} forwarded onSurrender={setSurrenderLoan} />)}{forwarded.length === 0 && <p className="text-sm text-[#737373]">No forwarded submissions found.</p>}</div>}</div></div></main></div>;
}

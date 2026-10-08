"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import SignOutButton from "@/components/sign-out-button";
import type { UserProfileIdentity } from "@/lib/supabase/user-role";
import styles from "./cashier.module.css";

const navigation = [
  { label: "Forms", icon: "/cashier/forms.svg" },
  { label: "Daily Report", icon: "/cashier/daily-report.svg" },
  { label: "Active Loans", icon: "/cashier/active-loans.svg" },
];

type Flow = "home" | "payment" | "release" | "report" | "activeLoans" | "loanDetail";
type Confirmation = "payment" | "release" | null;

function Logo() {
  return <div className={styles.logo} aria-label="QVDS"><Image src="/cashier/logo-mark.svg" alt="" width={26.4375} height={27.5625} priority /></div>;
}

function AccountCard({ userProfile }: { userProfile: UserProfileIdentity }) {
  return (
    <div className={styles.accountCard}>
      <div className={styles.avatar}>
        <Image src="/cashier/avatar.png" alt={userProfile.fullName} width={40} height={40} />
        <span className={styles.online}><Image src="/cashier/status-online.svg" alt="" width={10} height={10} /></span>
      </div>
      <div className={styles.accountText}><strong>{userProfile.fullName}</strong><span>{userProfile.role}</span></div>
      <SignOutButton iconSrc="/cashier/sign-out.svg" iconSize={16} buttonClassName={styles.signOut} />
    </div>
  );
}

function Navigation({ query, onQueryChange, activeItem, onNavigate }: { query: string; onQueryChange: (value: string) => void; activeItem: string; onNavigate: (label: string) => void }) {
  const items = useMemo(() => navigation.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return (
    <>
      <div className={styles.navHeader}>
        <Logo />
        <label className={styles.search}><Image src="/cashier/search.svg" alt="" width={16} height={16} /><input aria-label="Search navigation" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search" /></label>
      </div>
      <nav className={styles.navigation} aria-label="Cashier navigation">
        {items.map((item) => <button key={item.label} type="button" aria-current={item.label === activeItem ? "page" : undefined} onClick={() => onNavigate(item.label)}><Image src={item.icon} alt="" width={20} height={20} />{item.label}</button>)}
        {items.length === 0 ? <p className={styles.noResults}>No navigation items found.</p> : null}
      </nav>
    </>
  );
}

function BranchBadge() {
  return <span className={styles.branchBadge}><Image src="/cashier/building.svg" alt="" width={12} height={12} />Caloocan Branch</span>;
}

function ActionCard({ title, description, icon, buttonLabel, onSelect }: { title: string; description: string; icon: string; buttonLabel: string; onSelect: () => void }) {
  return (
    <article className={styles.actionCard}>
      <div className={styles.cardContent}><span className={styles.cardIcon}><Image src={icon} alt="" width={20} height={20} /></span><div className={styles.cardCopy}><h2>{title}</h2><p>{description}</p></div></div>
      <div className={styles.cardFooter}><button type="button" className={styles.primaryButton} onClick={onSelect}><Image src="/cashier/plus.svg" alt="" width={20} height={20} /><span>{buttonLabel}</span></button></div>
    </article>
  );
}

function ScreenHeader({ section, title, description, searchPlaceholder }: { section: string; title: string; description: string; searchPlaceholder: string }) {
  return (
    <header className={styles.flowHeader}>
      <div className={styles.breadcrumb}><span>Forms</span><span className={styles.slash}>/</span><strong>{section}</strong></div>
      <div className={styles.flowHeadingRow}>
        <div><div className={styles.flowTitle}><h1>{title}</h1><BranchBadge /></div><p>{description}</p></div>
        <label className={styles.loanSearch}><Image src="/cashier/search.svg" alt="" width={16} height={16} /><input aria-label={searchPlaceholder} placeholder={searchPlaceholder} /></label>
      </div>
    </header>
  );
}

function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return <label className={styles.field}><span>{label}</span>{children}{error ? <span className={styles.errorText}>{error}</span> : hint ? <small>{hint}</small> : null}</label>;
}

function TextInput({ value, onChange, placeholder, invalid, readOnly }: { value?: string; onChange?: (value: string) => void; placeholder?: string; invalid?: boolean; readOnly?: boolean }) {
  return <span className={`${styles.inputShell} ${invalid ? styles.inputError : ""}`}><input value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} placeholder={placeholder} aria-invalid={invalid || undefined} readOnly={readOnly} />{invalid ? <Image src="/cashier/alert-circle.svg" alt="" width={16} height={16} /> : null}</span>;
}

function DateField({ label, hideIconOnMobile = false }: { label: string; hideIconOnMobile?: boolean }) {
  return <Field label={label}><span className={styles.inputShell}><Image className={hideIconOnMobile ? styles.mobileHiddenDateIcon : undefined} src="/cashier/calendar.svg" alt="" width={20} height={20} /><input value="09 / 04 / 2026" readOnly aria-label={label} /></span></Field>;
}

function SelectField({ label }: { label: string }) {
  return <Field label={label}><span className={styles.inputShell}><select defaultValue="Cash" aria-label={label}><option>Cash</option><option>GCash</option><option>Bank transfer</option></select><Image src="/cashier/chevron-down.svg" alt="" width={16} height={16} /></span></Field>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.formCard}><h2>{title}</h2><div className={styles.sectionRule} />{children}</section>;
}

function FormActions({ submitLabel, onCancel, disabled }: { submitLabel: string; onCancel: () => void; disabled?: boolean }) {
  return <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button type="submit" className={styles.submitButton} disabled={disabled}>{submitLabel}</button></div>;
}

function currencyValue(value: string) {
  return Number(value.replace(/[^\d.]/g, ""));
}

function PaymentForm({ onCancel, onConfirm, loan }: { onCancel: () => void; onConfirm: () => void; loan?: { loanId: string; client: string; balance: string; nextAmountDue: string } }) {
  const paymentLoan = loan ?? { loanId: "LN-0266", client: "Soriano, Elena", balance: "₱90,377.80", nextAmountDue: "₱1,291.11" };
  const balance = currencyValue(paymentLoan.balance);
  const suggestedAmount = currencyValue(paymentLoan.nextAmountDue);
  const [amount, setAmount] = useState(suggestedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const numericAmount = Number(amount.replaceAll(",", ""));
  const invalid = Number.isFinite(numericAmount) && numericAmount > balance;
  const afterPayment = !invalid && Number.isFinite(numericAmount) ? Math.max(0, balance - numericAmount) : null;
  function submit(event: FormEvent) { event.preventDefault(); if (!invalid) onConfirm(); }
  return (
    <form className={styles.flowContent} onSubmit={submit}>
      <ScreenHeader section="Payment Intake" title="Record a payment" description="Log a payment received from a client against an active loan." searchPlaceholder="Search active loans" />
      <section className={styles.balanceCard}><div><span>Current balance — {paymentLoan.loanId} · {paymentLoan.client}</span><strong>{paymentLoan.balance}</strong></div><div><span>After this payment</span><strong className={styles.balanceAfter}>{afterPayment === null ? "—" : `₱${afterPayment.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong></div></section>
      <SectionCard title="PAYMENT DETAILS"><div className={styles.formGrid}><Field label="Amount paid (₱)" hint={`Daily amortization — ${paymentLoan.nextAmountDue}`} error={invalid ? `Amount exceeds the balance remaining (${paymentLoan.balance}). Enter ${paymentLoan.balance} or less.` : undefined}><TextInput value={amount} onChange={setAmount} invalid={invalid} /></Field><DateField label="Payment date" /><SelectField label="Payment method" /><Field label="Reference no."><TextInput placeholder="Required for GCash / bank transfer" /></Field></div></SectionCard>
      <FormActions submitLabel="Record payment" onCancel={onCancel} disabled={invalid} />
    </form>
  );
}

const clientInfo = [
  ["Loan ID", "LN-0142"], ["Client", "Garcia, Jose"], ["Status", "Approved"],
  ["Amount applied", "₱60,000.00"], ["CI recommended", "₱50,000.00"], ["Approved amount", "₱50,000.00"],
  ["Approved by", "Jose Rizal (BM)"], ["Approval date", "Sep 3, 2026"], ["Branch", "Caloocan Branch"],
];

function ReleaseForm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  function submit(event: FormEvent) { event.preventDefault(); onConfirm(); }
  return (
    <form className={styles.flowContent} onSubmit={submit}>
      <ScreenHeader section="Release of Funds" title="Release loan proceeds" description="Disburse approved loan funds to a client." searchPlaceholder="Search approved loans" />
      <SectionCard title="CLIENT INFORMATION"><div className={styles.infoGrid}>{clientInfo.map(([label, value]) => <div key={label}><span>{label}</span>{label === "Status" ? <strong className={styles.statusBadge}>• {value}</strong> : <strong>{value}</strong>}</div>)}</div></SectionCard>
      <SectionCard title="RELEASE DETAILS"><div className={styles.formGrid}><Field label="Amount released (₱)" hint="Approved amount — cannot be changed"><TextInput value="50,000.00" readOnly /></Field><DateField label="Release date" hideIconOnMobile /><SelectField label="Release method" /><Field label="Reference no."><TextInput placeholder="Required for GCash / bank transfer" /></Field></div></SectionCard>
      <FormActions submitLabel="Release funds" onCancel={onCancel} />
    </form>
  );
}

function ConfirmationDialog({ type, onClose, onComplete, paymentLoan }: { type: Exclude<Confirmation, null>; onClose: () => void; onComplete: () => void; paymentLoan?: { loanId: string; client: string; balance: string; nextAmountDue: string } }) {
  const payment = type === "payment";
  const [isMobile, setIsMobile] = useState(false);
  const paymentAmount = paymentLoan?.nextAmountDue ?? "₱1,291.11";
  const balanceAfter = paymentLoan ? currencyValue(paymentLoan.balance) - currencyValue(paymentAmount) : 89086.69;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsMobile(media.matches);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    syncViewport();
    media.addEventListener("change", syncViewport);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      media.removeEventListener("change", syncViewport);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description">
        <button type="button" className={styles.modalClose} aria-label="Close confirmation" onClick={onClose} autoFocus><Image src="/cashier/x-close.svg" alt="" width={20} height={20} /></button>
        <h2 id="confirmation-title">{payment ? "Record this payment?" : "Release these funds?"}</h2>
        <p id="confirmation-description">{payment ? `${paymentAmount} will be recorded against ${paymentLoan?.loanId ?? "LN-0266"} — ${paymentLoan?.client ?? "Soriano, Elena"}, bringing the balance remaining to ₱${balanceAfter.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Recorded payments cannot be edited — a correction requires a reversal entry.` : "₱50,000.00 will be released in cash to LN-0142 — Garcia, Jose. This marks the loan as released and starts the 60-day payment schedule on Sep 5, 2026. This cannot be undone."}</p>
        <label><span className={styles.desktopRemarks}>Remarks (optional)</span><textarea aria-label="Remarks (optional)" placeholder={isMobile ? "Add a note for the record…" : "Add a note for the record"} /></label>
        <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}><span className={styles.desktopCancel}>Cancel</span><span className={styles.mobileCancel}>Go back</span></button><button type="button" className={styles.submitButton} onClick={onComplete}>{payment ? "Record payment" : "Release funds"}</button></div>
      </section>
    </div>
  );
}

const reportTransactions = [
  { time: "08:42 AM", loanId: "LN-0023", client: "Reyes, Juan", type: "Payment intake", amount: "₱1,108.00", method: "Cash" },
  { time: "09:15 AM", loanId: "LN-0204", client: "Villanueva, Luz", type: "Payment intake", amount: "₱1,291.11", method: "GCash" },
  { time: "10:03 AM", loanId: "LN-0087", client: "Cruz, Maria", type: "Payment intake", amount: "₱1,032.89", method: "Cash" },
  { time: "01:30 PM", loanId: "LN-0142", client: "Garcia, Jose", type: "Fund release", amount: "₱50,000.00", method: "Cash" },
  { time: "02:45 PM", loanId: "LN-0078", client: "Mendoza, Carlos", type: "Fund release", amount: "₱60,000.00", method: "Bank transfer" },
];

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <article className={styles.summaryCard}><span>{label}</span><strong>{value}</strong></article>;
}

function usePagination<T>(items: T[], initialPageSize: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const previousPage = () => setPage((value) => Math.max(1, value - 1));
  const nextPage = () => setPage((value) => Math.min(pageCount, value + 1));
  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return { currentPage, pageCount, pageItems, pageSize, setPage, previousPage, nextPage, changePageSize };
}

function DailyReport() {
  const pagination = usePagination(reportTransactions, 5);
  const exportReport = () => {
    const rows = [
      ["Time", "Loan ID", "Client", "Type", "Amount", "Method"],
      ...reportTransactions.map((item) => [item.time, item.loanId, item.client, item.type, item.amount, item.method]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "daily-report-2026-09-04.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={styles.reportPage} aria-labelledby="daily-report-title">
      <header className={styles.reportHeader}>
        <div className={styles.reportTitle}><h1 id="daily-report-title">Daily report</h1><BranchBadge /></div>
        <div className={styles.reportActions}>
          <button type="button"><Image src="/cashier/report-calendar.svg" alt="" width={16} height={16} />September 4, 2026</button>
          <button type="button" onClick={exportReport}><Image src="/cashier/download.svg" alt="" width={16} height={16} />Export</button>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Payment intake" value="₱3,432.00" />
        <SummaryCard label="Funds released" value="₱110,000.00" />
        <SummaryCard label="Transactions" value="5" />
      </div>

      <section className={styles.reconciliation} aria-labelledby="reconciliation-title">
        <h2 id="reconciliation-title">Cash reconciliation — September 4, 2026</h2>
        <dl className={styles.reconciliationGrid}>
          <div><dt>Opening cash float</dt><dd>₱75,000.00</dd></div>
          <div><dt>Cash received</dt><dd>₱2,140.89</dd></div>
          <div><dt>Cash released</dt><dd>−₱50,000.00</dd></div>
          <div><dt>Expected cash on hand</dt><dd>₱27,140.89</dd></div>
          <div><dt>Counted cash</dt><dd>₱27,140.89</dd></div>
          <div><dt>Variance</dt><dd className={styles.positive}>₱0.00</dd></div>
        </dl>
        <p>Non-cash today — GCash received ₱1,291.11 · Bank transfer released ₱60,000.00. The payment intake and funds released totals above include both cash and non-cash.</p>
      </section>

      <section className={styles.transactionSection} aria-labelledby="transaction-title">
        <h2 id="transaction-title">Transaction log — September 4, 2026</h2>
        <div className={styles.desktopTable}>
          <table>
            <thead><tr><th>Time</th><th>Loan ID</th><th>Client</th><th>Type</th><th>Amount</th></tr></thead>
            <tbody>{pagination.pageItems.map((item) => <tr key={item.loanId}><td>{item.time}</td><td>{item.loanId}</td><td>{item.client}</td><td className={item.type === "Payment intake" ? styles.paymentType : styles.releaseType}>{item.type}</td><td>{item.amount}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={styles.mobileTransactions}>
          {pagination.pageItems.map((item) => (
            <article key={item.loanId} className={styles.transactionCard}>
              <div className={styles.transactionCardTop}><time>{item.time}</time><span className={item.type === "Payment intake" ? styles.paymentBadge : styles.releaseBadge}>{item.type}</span></div>
              <strong>{item.client}</strong>
              <dl><div><dt>Loan ID</dt><dd>{item.loanId}</dd></div><div><dt>Amount</dt><dd>{item.amount}</dd></div><div><dt>Method</dt><dd>{item.method}</dd></div></dl>
            </article>
          ))}
        </div>
        <footer className={styles.pagination}>
          <div className={styles.mobilePaginationButton}><button type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage} aria-label="Previous page"><Image src="/cashier/arrow-left.svg" alt="" width={16} height={16} loading="eager" /></button></div>
          <div className={styles.pageDetails}><span>Page {pagination.currentPage} of {pagination.pageCount}</span><label><select aria-label="Rows per page" value={pagination.pageSize} onChange={(event) => pagination.changePageSize(Number(event.target.value))}>{[2, 5, 20].map((size) => <option key={size} value={size}>{size} per page</option>)}</select><Image src="/cashier/chevron-down.svg" alt="" width={16} height={16} /></label></div>
          <div className={styles.pageButtons}><button type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage}>Previous</button><button type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage}>Next</button></div>
          <div className={styles.mobilePaginationButton}><button type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage} aria-label="Next page"><Image src="/cashier/arrow-right.svg" alt="" width={16} height={16} loading="eager" /></button></div>
        </footer>
      </section>
    </section>
  );
}

type LoanStatus = "Active" | "Restructured" | "Overdue";

type PaymentHistoryItem = {
  date: string;
  amount: string;
  method: "Cash" | "GCash";
  reference: string;
  recordedBy: string;
  balanceAfter: string;
};

type ActiveLoan = {
  loanId: string;
  client: string;
  loanAmount: string;
  balance: string;
  nextDueDate: string;
  status: LoanStatus;
  nextAmountDue: string;
  totalRepayable: string;
  paidAmount: string;
  paidPercent: number;
  loanProduct: string;
  dateReleased: string;
  contactNumber: string;
  payments: PaymentHistoryItem[];
};

const reyesPayments: PaymentHistoryItem[] = [
  { date: "Sep 4, 2026", amount: "₱1,108.00", method: "Cash", reference: "—", recordedBy: "M. San Jose (Cashier)", balanceAfter: "₱26,592.00" },
  { date: "Sep 3, 2026", amount: "₱1,108.00", method: "GCash", reference: "GC-8842019", recordedBy: "M. San Jose (Cashier)", balanceAfter: "₱27,700.00" },
  { date: "Sep 2, 2026", amount: "₱1,108.00", method: "Cash", reference: "—", recordedBy: "M. San Jose (Cashier)", balanceAfter: "₱28,808.00" },
  { date: "Sep 1, 2026", amount: "₱1,108.00", method: "GCash", reference: "GC-8791233", recordedBy: "M. San Jose (Cashier)", balanceAfter: "₱29,916.00" },
  { date: "Aug 31, 2026", amount: "₱1,108.00", method: "Cash", reference: "—", recordedBy: "M. San Jose (Cashier)", balanceAfter: "₱31,024.00" },
];

const activeLoans: ActiveLoan[] = [
  { loanId: "LN-0023", client: "Reyes, Juan", loanAmount: "₱60,000.00", balance: "₱26,592.00", nextDueDate: "Sep 5, 2026", status: "Active", nextAmountDue: "₱1,108.00", totalRepayable: "₱66,480.00", paidAmount: "₱39,888.00", paidPercent: 60, loanProduct: "₱60,000 / 60 days", dateReleased: "Jul 30, 2026", contactNumber: "0917 123 4567", payments: reyesPayments },
  { loanId: "LN-0087", client: "Cruz, Maria", loanAmount: "₱100,000.00", balance: "₱51,644.40", nextDueDate: "Sep 5, 2026", status: "Restructured", nextAmountDue: "₱1,721.48", totalRepayable: "₱116,200.00", paidAmount: "₱64,555.60", paidPercent: 56, loanProduct: "₱100,000 / 90 days", dateReleased: "Jul 18, 2026", contactNumber: "0918 246 8102", payments: [] },
  { loanId: "LN-0204", client: "Villanueva, Luz", loanAmount: "₱100,000.00", balance: "₱58,100.05", nextDueDate: "Sep 5, 2026", status: "Active", nextAmountDue: "₱1,291.11", totalRepayable: "₱116,200.00", paidAmount: "₱58,099.95", paidPercent: 50, loanProduct: "₱100,000 / 90 days", dateReleased: "Jul 22, 2026", contactNumber: "0917 555 0147", payments: [] },
  { loanId: "LN-0411", client: "Aquino, Miguel", loanAmount: "₱60,000.00", balance: "₱8,864.00", nextDueDate: "Aug 27, 2026 · 8 days overdue", status: "Overdue", nextAmountDue: "₱1,108.00", totalRepayable: "₱66,480.00", paidAmount: "₱57,616.00", paidPercent: 87, loanProduct: "₱60,000 / 60 days", dateReleased: "Jul 2, 2026", contactNumber: "0920 714 6631", payments: [] },
  { loanId: "LN-0266", client: "Soriano, Elena", loanAmount: "₱100,000.00", balance: "₱90,377.80", nextDueDate: "Sep 5, 2026", status: "Active", nextAmountDue: "₱1,291.11", totalRepayable: "₱116,200.00", paidAmount: "₱25,822.20", paidPercent: 22, loanProduct: "₱100,000 / 90 days", dateReleased: "Aug 12, 2026", contactNumber: "0919 820 3345", payments: [] },
];

function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <span className={`${styles.loanStatus} ${styles[`loanStatus${status}`]}`}>{status}</span>;
}

function ActiveLoans({ onViewDetails }: { onViewDetails: (loanId: string) => void }) {
  const [loanQuery, setLoanQuery] = useState("");
  const [status, setStatus] = useState<"All" | LoanStatus>("All");
  const normalizedQuery = loanQuery.trim().toLowerCase();
  const loans = activeLoans.filter((loan) => (
    (status === "All" || loan.status === status)
    && (!normalizedQuery || loan.loanId.toLowerCase().includes(normalizedQuery) || loan.client.toLowerCase().includes(normalizedQuery))
  ));
  const pagination = usePagination(loans, 5);
  const isEmpty = loans.length === 0;

  return (
    <section className={`${styles.activeLoansPage} ${isEmpty ? styles.activeLoansEmpty : ""}`} aria-labelledby="active-loans-title">
      <header className={styles.activeLoansHeader}>
        <div className={styles.activeLoansTitle}><h1 id="active-loans-title">Active loans</h1><BranchBadge /></div>
        <div className={styles.loanFilters}>
          <label className={styles.activeLoanSearch}><Image src="/cashier/search.svg" alt="" width={16} height={16} /><input value={loanQuery} onChange={(event) => { setLoanQuery(event.target.value); pagination.setPage(1); }} aria-label="Search active loans" placeholder="Search by client or loan ID" /></label>
          <label className={styles.statusFilter}><span className={styles.srOnly}>Filter by status</span><select value={status} onChange={(event) => { setStatus(event.target.value as "All" | LoanStatus); pagination.setPage(1); }}><option value="All">Status</option><option>Active</option><option>Restructured</option><option>Overdue</option></select><Image src="/cashier/chevron-down.svg" alt="" width={16} height={16} /></label>
        </div>
      </header>

      {isEmpty ? (
        <div className={styles.loanEmptyState}>
          <h2>No active loans</h2>
          <p><span className={styles.emptyDesktopCopy}>Loans appear here once their funds have been released. Record a release from Forms → Release of funds.</span><span className={styles.emptyMobileCopy}>Loans appear here once their funds have been released.</span></p>
        </div>
      ) : (
        <section className={styles.loanList} aria-label="Active loans">
          <div className={styles.activeLoansTable}>
            <table>
              <thead><tr><th>Loan ID</th><th>Client</th><th>Loan amount</th><th>Balance remaining</th><th>Next due date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{pagination.pageItems.map((loan) => <tr key={loan.loanId}><td>{loan.loanId}</td><td>{loan.client}</td><td>{loan.loanAmount}</td><td>{loan.balance}</td><td>{loan.nextDueDate}</td><td><LoanStatusBadge status={loan.status} /></td><td><button type="button" className={styles.viewLoanButton} onClick={() => onViewDetails(loan.loanId)}><Image src="/cashier/eye.svg" alt="" width={20} height={20} />View details</button></td></tr>)}</tbody>
            </table>
          </div>

          <div className={styles.mobileLoanCards}>{pagination.pageItems.map((loan) => (
            <article className={styles.loanCard} key={loan.loanId}>
              <div className={styles.loanCardTop}><span>{loan.loanId}</span><LoanStatusBadge status={loan.status} /></div>
              <h2>{loan.client}</h2>
              <dl><div><dt>Loan amount</dt><dd>{loan.loanAmount}</dd></div><div><dt>Balance remaining</dt><dd>{loan.balance}</dd></div><div><dt>Next due date</dt><dd>{loan.nextDueDate}</dd></div></dl>
              <button type="button" className={styles.viewLoanButton} onClick={() => onViewDetails(loan.loanId)}>View details</button>
            </article>
          ))}</div>

          <footer className={styles.loanPagination}>
            <button className={styles.loanMobilePageButton} type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage} aria-label="Previous page"><Image src="/cashier/arrow-left.svg" alt="" width={16} height={16} /></button>
            <div className={styles.loanPageDetails}><span>Page {pagination.currentPage} of {pagination.pageCount}</span><label><select aria-label="Loans per page" value={pagination.pageSize} onChange={(event) => pagination.changePageSize(Number(event.target.value))}>{[2, 5, 10].map((size) => <option key={size} value={size}>{size} per page</option>)}</select><Image src="/cashier/chevron-down.svg" alt="" width={16} height={16} /></label></div>
            <div className={styles.loanDesktopPageButtons}><button type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage}>Previous</button><button type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage}>Next</button></div>
            <button className={styles.loanMobilePageButton} type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage} aria-label="Next page"><Image src="/cashier/arrow-right.svg" alt="" width={16} height={16} /></button>
          </footer>
        </section>
      )}
    </section>
  );
}

function LoanDetail({ loan, onBack, onRecordPayment }: { loan: ActiveLoan; onBack: () => void; onRecordPayment: () => void }) {
  const pagination = usePagination(loan.payments, 5);
  const summary = [
    ["Loan amount", loan.loanAmount],
    ["Balance remaining", loan.balance],
    ["Next due date", loan.nextDueDate],
    ["Next amount due", loan.nextAmountDue],
  ];
  const loanInfo = [
    ["Loan product", loan.loanProduct],
    ["Date released", loan.dateReleased],
    ["Contact number", loan.contactNumber],
    ["Branch", "Caloocan Branch"],
  ];

  return (
    <section className={styles.loanDetailPage} aria-labelledby="loan-detail-title">
      <header className={styles.loanDetailHeader}>
        <div className={styles.loanDetailBreadcrumb}><button type="button" onClick={onBack}>Active Loans</button><span>/</span><strong>{loan.loanId}</strong></div>
        <div className={styles.loanDetailHeading}>
          <div className={styles.loanDetailIdentity}><h1 id="loan-detail-title">{loan.client}</h1><BranchBadge /><LoanStatusBadge status={loan.status} /></div>
          <button type="button" className={`${styles.primaryButton} ${styles.recordPaymentButton}`} onClick={onRecordPayment}><Image src="/cashier/plus.svg" alt="" width={20} height={20} />Record payment</button>
        </div>
      </header>

      <div className={styles.loanSummaryGrid}>{summary.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>

      <div className={styles.loanProgress}>
        <div aria-hidden="true"><span style={{ width: `${loan.paidPercent}%` }} /></div>
        <p><span>{loan.paidPercent}% paid</span><span>{loan.paidAmount} paid of {loan.totalRepayable} total repayable</span></p>
      </div>

      <section className={styles.loanInfoCard} aria-label="Loan information">
        {loanInfo.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>

      <section className={styles.paymentHistory} aria-labelledby="payment-history-title">
        <h2 id="payment-history-title">Payment history</h2>
        {loan.payments.length ? (
          <>
            <div className={styles.paymentHistoryTable}>
              <table>
                <thead><tr><th>Payment date ↓</th><th>Amount</th><th>Method</th><th>Reference no.</th><th>Recorded by</th></tr></thead>
                <tbody>{pagination.pageItems.map((payment) => <tr key={`${payment.date}-${payment.reference}`}><td>{payment.date}</td><td>{payment.amount}</td><td>{payment.method}</td><td>{payment.reference}</td><td>{payment.recordedBy}</td></tr>)}</tbody>
              </table>
            </div>
            <div className={styles.mobilePaymentCards}>{pagination.pageItems.map((payment) => (
              <article key={`${payment.date}-${payment.reference}`}>
                <div className={styles.paymentCardTop}><time>{payment.date}</time><span>• {payment.method}</span></div>
                <strong>{payment.amount}</strong>
                <dl><div><dt>Reference no.</dt><dd>{payment.reference}</dd></div><div><dt>Recorded by</dt><dd>{payment.recordedBy}</dd></div><div><dt>Balance after</dt><dd>{payment.balanceAfter}</dd></div></dl>
              </article>
            ))}</div>
          </>
        ) : <p className={styles.noPayments}>No payments have been recorded for this loan.</p>}
        <footer className={styles.detailPagination}>
          <button type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage} aria-label="Previous payment page"><Image src="/cashier/arrow-left.svg" alt="" width={16} height={16} /></button>
          <div><span>Page {pagination.currentPage} of {pagination.pageCount}</span><label><select aria-label="Payments per page" value={pagination.pageSize} onChange={(event) => pagination.changePageSize(Number(event.target.value))}>{[2, 5, 10].map((size) => <option key={size} value={size}>{size} per page</option>)}</select><Image src="/cashier/chevron-down.svg" alt="" width={16} height={16} /></label></div>
          <div className={styles.detailDesktopPagination}><button type="button" disabled={pagination.currentPage === 1} onClick={pagination.previousPage}>Previous</button><button type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage}>Next</button></div>
          <button type="button" disabled={pagination.currentPage === pagination.pageCount} onClick={pagination.nextPage} aria-label="Next payment page"><Image src="/cashier/arrow-right.svg" alt="" width={16} height={16} /></button>
        </footer>
      </section>
    </section>
  );
}

export default function CashierApp({ userProfile }: { userProfile: UserProfileIdentity }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("home");
  const [selectedLoanId, setSelectedLoanId] = useState("LN-0023");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [announcement, setAnnouncement] = useState("");
  const selectedLoan = activeLoans.find((loan) => loan.loanId === selectedLoanId) ?? activeLoans[0];
  const goHome = () => { setFlow("home"); setConfirmation(null); };
  const complete = () => { setAnnouncement(confirmation === "payment" ? "Payment recorded." : "Funds released."); goHome(); };
  const activeItem = flow === "report" ? "Daily Report" : flow === "activeLoans" || flow === "loanDetail" ? "Active Loans" : "Forms";
  const navigate = (label: string) => {
    if (label === "Daily Report") setFlow("report");
    if (label === "Active Loans") setFlow("activeLoans");
    if (label === "Forms") goHome();
    setMobileOpen(false);
  };
  return (
    <div className={styles.shell}>
      <header className={styles.mobileHeader}><Logo /><button type="button" aria-label="Open navigation menu" onClick={() => setMobileOpen(true)}><Image src="/cashier/menu.svg" alt="" width={20} height={20} /></button></header>
      <aside className={styles.sidebar}><Navigation query={query} onQueryChange={setQuery} activeItem={activeItem} onNavigate={navigate} /><AccountCard userProfile={userProfile} /></aside>
      {mobileOpen ? <div className={styles.mobileMenu}><button className={styles.backdrop} type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} /><aside className={styles.drawer} aria-label="Mobile navigation"><div className={styles.drawerTop}><Logo /><button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}>×</button></div><Navigation query={query} onQueryChange={setQuery} activeItem={activeItem} onNavigate={navigate} /><AccountCard userProfile={userProfile} /></aside></div> : null}
      <main className={`${styles.main} ${flow === "report" ? styles.reportMain : ""}`}>
        {flow === "home" ? <><header className={styles.pageHeader}><div className={styles.titleRow}><h1>Forms</h1><BranchBadge /></div><p>Record a payment or release approved loan funds.</p></header><section className={styles.cardGrid} aria-label="Cashier forms"><ActionCard title="Payment Intake" description="Record a payment received from a client against an active loan." icon="/cashier/wallet.svg" buttonLabel="Record payment" onSelect={() => { setSelectedLoanId("LN-0266"); setFlow("payment"); }} /><ActionCard title="Release of funds" description="Release approved loan proceeds to a client." icon="/cashier/bank-note.svg" buttonLabel="Record release" onSelect={() => setFlow("release")} /></section></> : null}
        {flow === "payment" ? <PaymentForm key={selectedLoanId} loan={selectedLoan} onCancel={goHome} onConfirm={() => setConfirmation("payment")} /> : null}
        {flow === "release" ? <ReleaseForm onCancel={goHome} onConfirm={() => setConfirmation("release")} /> : null}
        {flow === "report" ? <DailyReport /> : null}
        {flow === "activeLoans" ? <ActiveLoans onViewDetails={(loanId) => { setSelectedLoanId(loanId); setFlow("loanDetail"); setAnnouncement(`Opened details for ${loanId}.`); }} /> : null}
        {flow === "loanDetail" ? <LoanDetail loan={selectedLoan} onBack={() => setFlow("activeLoans")} onRecordPayment={() => setFlow("payment")} /> : null}
        <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
      </main>
      {confirmation ? <ConfirmationDialog type={confirmation} paymentLoan={selectedLoan} onClose={() => setConfirmation(null)} onComplete={complete} /> : null}
    </div>
  );
}

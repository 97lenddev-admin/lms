"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import ActionDialog from "./action-dialog";
import styles from "./utility-screens.module.css";

const penaltyLoans = [
  { id: "LN-0023", client: "Reyes, Juan", balance: "₱39,000.00", overdue: 12, penalty: "₱1,170" },
  { id: "LN-0087", client: "Cruz, Maria", balance: "₱58,000.00", overdue: 7, penalty: "₱1,740" },
  { id: "LN-0204", client: "Villanueva, Luz", balance: "₱72,000.00", overdue: 21, penalty: "₱2,160" },
  { id: "LN-0411", client: "Aquino, Miguel", balance: "₱33,000.00", overdue: 4, penalty: "₱990" },
];

type PenaltyLoan = (typeof penaltyLoans)[number];

export default function Penalties() {
  const [selected, setSelected] = useState<PenaltyLoan | null>(null);
  const [forwardLoan, setForwardLoan] = useState<PenaltyLoan | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function show(loan: PenaltyLoan) {
    setSelected(loan);
    requestAnimationFrame(() => dialog.current?.showModal());
  }

  const actions = (loan: PenaltyLoan) => <div className={`${styles.actions} ${styles.penaltyActions}`}>
    <button className={styles.secondaryButton} onClick={() => show(loan)}><Image src="/branch-manager/imgEye.svg" alt="" width={20} height={20} />View</button>
    <button className={styles.primaryButton} onClick={() => setForwardLoan(loan)}><Image src="/branch-manager/penalty-send.svg" alt="" width={20} height={20} />Forward for waiver</button>
  </div>;

  return <main className={styles.main}>
    <header className={`${styles.pageHeader} ${styles.penaltyHeader}`}><h1>Loans with penalties</h1><p>Loans past the end of their contract period. Late charge is 3% of the unpaid balance.</p></header>
    {notice && <p role="status" className={styles.statusNotice}>{notice}</p>}
    <div className={styles.desktopTable}>
      <table className={styles.penaltyTable}>
        <colgroup><col className={styles.loanIdColumn} /><col className={styles.clientColumn} /><col /><col className={styles.overdueColumn} /><col className={styles.penaltyColumn} /><col className={styles.penaltyActionColumn} /></colgroup>
        <thead><tr><th>Loan ID</th><th>Client</th><th>Unpaid balance</th><th>Days overdue</th><th>Penalty amount</th><th>Action</th></tr></thead>
        <tbody>{penaltyLoans.map(loan => <tr key={loan.id}><td>{loan.id}</td><td>{loan.client}</td><td>{loan.balance}</td><td><span className={styles.overdueBadge}>{loan.overdue} days</span></td><td className={styles.penaltyAmount}>{loan.penalty}</td><td>{actions(loan)}</td></tr>)}</tbody>
      </table>
    </div>
    <div className={styles.mobileCards}>{penaltyLoans.map(loan => <article className={styles.penaltyCard} key={loan.id}>
      <div className={styles.penaltyCardTop}><span>{loan.id}</span><span className={styles.overdueBadge}>{loan.overdue} days overdue</span></div><h2>{loan.client}</h2>
      <dl><div><dt>Unpaid balance</dt><dd>{loan.balance}</dd></div><div><dt>Penalty amount</dt><dd>{loan.penalty}</dd></div></dl>{actions(loan)}
    </article>)}</div>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div><h2>{selected?.id}</h2><button className={styles.secondaryButton} onClick={() => dialog.current?.close()}>Close</button></div>
      <p>{selected?.client} has an unpaid balance of {selected?.balance} and a current penalty of {selected?.penalty}.</p>
    </dialog>
    {forwardLoan && <ActionDialog
      open
      title="Forward this penalty for waiver?"
      description={`The ${forwardLoan.penalty} penalty on ${forwardLoan.id} — ${forwardLoan.client} (${forwardLoan.overdue} days overdue) will be sent to the Admin for a waiver decision. You will not be able to forward it again while a decision is pending.`}
      mobileDescription={`The penalty on ${forwardLoan.id} — ${forwardLoan.client} will be sent to the Admin for a waiver decision. You will not be able to forward it again while a decision is pending.`}
      confirmLabel="Forward for waiver"
      rows={[{ label: "Unpaid balance", value: forwardLoan.balance }, { label: "Days overdue", value: `${forwardLoan.overdue} days` }, { label: "Penalty amount", value: forwardLoan.penalty }]}
      noteLabel="Remarks for the Admin (optional)"
      notePlaceholder="Add a note supporting the waiver"
      onClose={() => setForwardLoan(null)}
      onConfirm={() => { setNotice(`${forwardLoan.id} was forwarded for waiver in this demo session.`); setForwardLoan(null); }}
    />}
  </main>;
}

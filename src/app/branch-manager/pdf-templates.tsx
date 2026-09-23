"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./utility-screens.module.css";

const templates = [
  { id: "TPL-0001", name: "Loan Contract Agreement", description: "Standard contract used for all loan products", updated: "Feb 12, 2026" },
  { id: "TPL-0002", name: "Non-Disclosure Agreement", description: "Used for co-maker and client confidentiality", updated: "Aug 4, 2025" },
  { id: "TPL-0003", name: "Loan Restructuring Agreement", description: "Used when a loan is restructured at 80%", updated: "Mar 30, 2026" },
  { id: "TPL-0004", name: "Promissory Note", description: "Issued upon release of loan funds", updated: "Nov 6, 2025" },
  { id: "TPL-0005", name: "Penalty Waiver Request Form", description: "Used to formally request a penalty waiver from admin", updated: "Jan 19, 2026" },
];

type Template = (typeof templates)[number];

export default function PdfTemplates() {
  const [selected, setSelected] = useState<Template | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function show(template: Template, action: "view" | "download") {
    setSelected(template);
    setNotice(action === "view"
      ? `${template.name} is a demo template. Connect the approved PDF file to preview its contents here.`
      : `${template.name} is not attached to this demo yet, so no file was downloaded.`);
    requestAnimationFrame(() => dialog.current?.showModal());
  }

  const actions = (template: Template) => <div className={styles.actions}>
    <button className={styles.secondaryButton} onClick={() => show(template, "view")}><Image src="/branch-manager/imgEye.svg" alt="" width={20} height={20} />View</button>
    <button className={styles.secondaryButton} onClick={() => show(template, "download")}><Image src="/branch-manager/pdf-download.svg" alt="" width={20} height={20} />Download</button>
  </div>;

  return <main className={styles.main}>
    <header className={styles.pageHeader}><h1>List of PDF templates</h1></header>
    <div className={styles.desktopTable}>
      <table className={styles.templateTable}>
        <colgroup><col className={styles.templateIdColumn} /><col /><col className={styles.updatedColumn} /><col className={styles.templateActionColumn} /></colgroup>
        <thead><tr><th>Template ID</th><th>Template name</th><th>Last updated</th><th>Action</th></tr></thead>
        <tbody>{templates.map(template => <tr key={template.id}>
          <td>{template.id}</td>
          <td><div className={styles.templateName}><span className={styles.desktopPdfIcon}><Image src="/branch-manager/pdf-page.svg" alt="" width={28} height={32} /><small>PDF</small></span><span><strong>{template.name}</strong><small>{template.description}</small></span></div></td>
          <td>{template.updated}</td><td>{actions(template)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className={styles.mobileCards}>{templates.map(template => <article className={styles.templateCard} key={template.id}>
      <div className={styles.templateCardTop}><span className={styles.pdfIcon}>PDF</span><div><h2>{template.name}</h2><p>{template.id}</p></div></div>
      <p className={styles.description}>{template.description}</p><p className={styles.updated}>Updated {template.updated}</p>{actions(template)}
    </article>)}</div>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div><h2>{selected?.name}</h2><button className={styles.secondaryButton} onClick={() => dialog.current?.close()}>Close</button></div><p>{notice}</p>
    </dialog>
  </main>;
}

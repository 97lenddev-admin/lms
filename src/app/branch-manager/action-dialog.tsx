"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./action-dialog.module.css";

export type ActionDialogRow = { label: string; value: string };
export type ActionDialogChoice = { label: string; value: string };

export default function ActionDialog({
  open,
  title,
  description,
  mobileDescription,
  confirmLabel,
  onClose,
  onConfirm,
  rows = [],
  choices = [],
  choiceLabel,
  defaultChoice,
  noteLabel,
  notePlaceholder,
  noteRequired = false,
  dangerHeading = false,
}: {
  open: boolean;
  title: string;
  description: string;
  mobileDescription?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (result: { choice?: string; note: string }) => void;
  rows?: ActionDialogRow[];
  choices?: ActionDialogChoice[];
  choiceLabel?: string;
  defaultChoice?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
  dangerHeading?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const choiceName = useId();
  const [choice, setChoice] = useState(defaultChoice ?? choices[0]?.value ?? "");
  const [note, setNote] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setChoice(defaultChoice ?? choices[0]?.value ?? "");
      setNote("");
      element.showModal();
      element.focus({ preventScroll: true });
    } else if (!open && element.open) {
      element.close();
    }
  }, [choices, defaultChoice, open]);

  const canConfirm = (!choices.length || Boolean(choice)) && (!noteRequired || Boolean(note.trim()));

  return <dialog
    ref={dialog}
    tabIndex={-1}
    className={styles.dialog}
    aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    <form className={styles.form} onSubmit={event => { event.preventDefault(); if (canConfirm) onConfirm({ choice: choice || undefined, note: note.trim() }); }}>
      <div className={styles.body}>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>×</button>
        <h2 id={titleId} className={dangerHeading ? styles.dangerHeading : undefined}>{title}</h2>
        <p className={`${styles.description} ${mobileDescription ? styles.desktopDescription : ""}`}>{description}</p>
        {mobileDescription && <p className={`${styles.description} ${styles.mobileDescription}`}>{mobileDescription}</p>}
        {rows.length > 0 && <dl className={styles.summary}>{rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
        {choices.length > 0 && <fieldset className={styles.choices}>
          <legend className={dangerHeading ? styles.dangerLabel : undefined}>{choiceLabel}</legend>
          {choices.map(option => <label key={option.value}><input type="radio" name={choiceName} value={option.value} checked={choice === option.value} onChange={() => setChoice(option.value)} /><span>{option.label}</span></label>)}
        </fieldset>}
        {noteLabel && <label className={styles.note}><span>{noteLabel}</span><textarea required={noteRequired} value={note} placeholder={notePlaceholder} onChange={event => setNote(event.target.value)} /></label>}
      </div>
      <footer className={styles.footer}>
        <button type="button" className={styles.secondary} onClick={onClose}>Cancel<span className={styles.mobileBack}>Go back</span></button>
        <button type="submit" className={styles.confirm} disabled={!canConfirm}>{confirmLabel}</button>
      </footer>
    </form>
  </dialog>;
}

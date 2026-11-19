"use server";

import { revalidatePath } from "next/cache";
import { requireUserRole } from "@/lib/supabase/require-user";

export type LoanDocumentUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type ApproveLoanResult =
  | { ok: true }
  | { ok: false; error: string };

export type RejectLoanResult =
  | { ok: true }
  | { ok: false; error: string };

export type ReturnLoanResult =
  | { ok: true }
  | { ok: false; error: string };

export type UpdateLoanTermsResult =
  | { ok: true }
  | { ok: false; error: string };

const loanDocumentBucket = "loan-application-documents";

export async function createLoanDocumentViewUrl(
  path: string,
): Promise<LoanDocumentUrlResult> {
  const { supabase } = await requireUserRole("Branch Manager");
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { ok: false, error: "This document link is invalid." };
  }

  const { data, error } = await supabase.storage
    .from(loanDocumentBucket)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    console.error("[branch-manager] Unable to create loan document URL", error);
    if (error?.statusCode === "404" || error?.message === "Object not found") {
      return {
        ok: false,
        error: "This stored file is unavailable. Apply the Branch Manager document-access migration; if it is already applied, ask the Credit Analyst to upload the file again.",
      };
    }
    return { ok: false, error: "The document could not be opened. Please try again." };
  }

  return { ok: true, url: data.signedUrl };
}

export async function approveLoan(
  loanId: string,
  reasonForApproving: string,
): Promise<ApproveLoanResult> {
  const normalizedLoanId = loanId.trim();
  const normalizedReason = reasonForApproving.trim();

  if (!normalizedLoanId) return { ok: false, error: "This loan is unavailable." };
  if (!normalizedReason) {
    return { ok: false, error: "Enter a reason before approving this loan." };
  }

  const { supabase } = await requireUserRole("Branch Manager");
  const { data, error } = await supabase
    .from("loans")
    .update({
      reason_for_approving: normalizedReason,
      status: "approved",
    })
    .eq("id", normalizedLoanId)
    .ilike("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[branch-manager] Unable to approve loan", {
      code: error.code,
      message: error.message,
      loanId: normalizedLoanId,
    });
    return { ok: false, error: "The loan could not be approved. Please try again." };
  }

  if (!data) {
    return {
      ok: false,
      error: "Only active loans awaiting a decision can be approved.",
    };
  }

  revalidatePath("/branch-manager");
  return { ok: true };
}

export async function rejectLoan(
  loanId: string,
  reasonForRejection: string,
  rejectionAdditionalDetails: string,
): Promise<RejectLoanResult> {
  const normalizedLoanId = loanId.trim();
  const normalizedReason = reasonForRejection.trim().slice(0, 500);
  const normalizedDetails = rejectionAdditionalDetails.trim().slice(0, 5000);

  if (!normalizedLoanId) return { ok: false, error: "This loan is unavailable." };
  if (!normalizedReason) {
    return { ok: false, error: "Select a reason for rejection." };
  }

  const { supabase } = await requireUserRole("Branch Manager");
  const { data, error } = await supabase
    .from("loans")
    .update({
      reason_for_rejection: normalizedReason,
      rejection_additional_details: normalizedDetails || null,
      status: "rejected",
    })
    .eq("id", normalizedLoanId)
    .ilike("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[branch-manager] Unable to reject loan", {
      code: error.code,
      message: error.message,
      loanId: normalizedLoanId,
    });
    return { ok: false, error: "The loan could not be rejected. Please try again." };
  }

  if (!data) {
    return {
      ok: false,
      error: "Only active loans awaiting a decision can be rejected.",
    };
  }

  revalidatePath("/branch-manager");
  return { ok: true };
}

export async function returnLoanToCi(
  loanId: string,
  revisionDetails: string,
): Promise<ReturnLoanResult> {
  const normalizedLoanId = loanId.trim();
  const normalizedDetails = revisionDetails.trim().slice(0, 5000);

  if (!normalizedLoanId) return { ok: false, error: "This loan is unavailable." };
  if (!normalizedDetails) {
    return { ok: false, error: "Enter what the Credit Investigator needs to revise." };
  }

  const { supabase } = await requireUserRole("Branch Manager");
  const { data, error } = await supabase
    .from("loans")
    .update({
      revision_details: normalizedDetails,
      status: "pending",
    })
    .eq("id", normalizedLoanId)
    .ilike("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[branch-manager] Unable to return loan to CI", {
      code: error.code,
      message: error.message,
      loanId: normalizedLoanId,
    });
    return { ok: false, error: "The loan could not be returned to the CI. Please try again." };
  }

  if (!data) {
    return {
      ok: false,
      error: "Only active loans awaiting a decision can be returned to the CI.",
    };
  }

  revalidatePath("/branch-manager");
  return { ok: true };
}

export async function updateLoanTerms(
  loanId: string,
  loanAmount: string,
  loanTerm: string,
  reasonForEditing: string,
): Promise<UpdateLoanTermsResult> {
  const normalizedLoanId = loanId.trim();
  const normalizedAmount = Number(loanAmount.replace(/[^0-9.]/g, ""));
  const normalizedTerm = Number.parseInt(loanTerm, 10);
  const normalizedReason = reasonForEditing.trim().slice(0, 5000);

  if (!normalizedLoanId) return { ok: false, error: "This loan is unavailable." };
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return { ok: false, error: "Select a valid loan amount." };
  }
  if (!Number.isInteger(normalizedTerm) || normalizedTerm <= 0) {
    return { ok: false, error: "Select a valid loan term." };
  }

  const { supabase } = await requireUserRole("Branch Manager");
  const { data, error } = await supabase
    .from("loans")
    .update({
      loan_amount: normalizedAmount,
      term: normalizedTerm,
      reason_for_editing: normalizedReason || null,
    })
    .eq("id", normalizedLoanId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[branch-manager] Unable to update loan terms", {
      code: error.code,
      message: error.message,
      loanId: normalizedLoanId,
    });
    return { ok: false, error: "The loan changes could not be saved. Please try again." };
  }

  if (!data) return { ok: false, error: "This loan could not be updated." };

  revalidatePath("/branch-manager");
  return { ok: true };
}

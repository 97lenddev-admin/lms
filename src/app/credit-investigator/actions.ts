"use server";

import { revalidatePath } from "next/cache";
import { requireUserRole } from "@/lib/supabase/require-user";

export type ClaimLoanResult =
  | { success: true; claimedAt: string }
  | { success: false; error: string };

export type ForwardLoanResult =
  | { success: true }
  | { success: false; error: string };

export type RejectLoanResult =
  | { success: true }
  | { success: false; error: string };

export type VoluntarySurrenderResult =
  | { success: true; investigationId: string }
  | { success: false; error: string };

export type CollateralItemInput = {
  description: string;
  age: string;
  value: string;
};

export type SaveCollateralResult =
  | { success: true; investigationId: string }
  | { success: false; error: string };

export type InvestigationReportInput = {
  businessName: string;
  recommendedAmount: string;
  businessStatus: string;
  observations: string;
  pendingRequirements: string;
  lendingRecords: {
    company: string;
    amount: string;
    installment: string;
    remarks: string;
    undisclosed: boolean;
  }[];
  plateNumber: string;
  insurance: string;
};

export type SaveInvestigationReportResult =
  | { success: true; investigationId: string }
  | { success: false; error: string };

const collateralAgeRules: Record<
  string,
  { ageRange: string; ratePercentage: number }
> = {
  "1–6 months": { ageRange: "1_to_6_months", ratePercentage: 10 },
  "7 months–2 years": {
    ageRange: "7_months_to_2_years",
    ratePercentage: 20,
  },
  "3–5 years": { ageRange: "3_to_5_years", ratePercentage: 30 },
  "6+ years": { ageRange: "6_plus_years", ratePercentage: 50 },
};

function numericValue(value: string) {
  return Number(value.replace(/[^0-9.-]/g, ""));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function manilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function safeFileName(name: string, contentType: string) {
  const extension = contentType === "image/png" ? ".png" : ".jpg";
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  const base = cleaned || `attestation${extension}`;
  return /\.(png|jpe?g)$/i.test(base) ? base : `${base}${extension}`;
}

export async function rejectCreditInvestigation(
  loanId: string,
  reasonForRejection: string,
  rejectionAdditionalDetails: string,
): Promise<RejectLoanResult> {
  const normalizedLoanId = loanId.trim();
  const normalizedReason = reasonForRejection.trim().slice(0, 500);
  const normalizedDetails = rejectionAdditionalDetails.trim().slice(0, 5000);

  if (!isUuid(normalizedLoanId)) {
    return { success: false, error: "Invalid loan submission." };
  }
  if (!normalizedReason) {
    return { success: false, error: "Select a reason for rejection." };
  }

  const { supabase } = await requireUserRole("Credit Investigator");
  const { error } = await supabase.rpc("credit_investigation_rejected", {
    p_loan_id: normalizedLoanId,
    p_stage: "investigation report",
    p_reason_for_rejection: normalizedReason,
    p_rejection_additional_details: normalizedDetails,
  });

  if (error) {
    console.error("[credit-investigator] Unable to reject investigation", {
      loanId: normalizedLoanId,
      code: error.code,
      message: error.message,
    });
    return { success: false, error: `Unable to reject this application: ${error.message}` };
  }

  revalidatePath("/credit-investigator");
  return { success: true };
}

export async function saveVoluntarySurrender(
  formData: FormData,
): Promise<VoluntarySurrenderResult> {
  const loanId = String(formData.get("loanId") ?? "").trim();
  const suppliedInvestigationId = String(formData.get("investigationId") ?? "").trim();
  const image = formData.get("attestation");

  if (!isUuid(loanId) || (suppliedInvestigationId && !isUuid(suppliedInvestigationId))) {
    return { success: false, error: "Invalid loan or investigation record." };
  }
  if (!(image instanceof File) || image.size === 0) {
    return { success: false, error: "Attach the signed attestation image before saving." };
  }
  if (!["image/png", "image/jpeg"].includes(image.type) || image.size > 5 * 1024 * 1024) {
    return { success: false, error: "The attestation must be a PNG or JPG file no larger than 5 MB." };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { success: false, error: "The surrendered items are invalid." };
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    return { success: false, error: "Add between 1 and 50 surrendered items." };
  }

  const surrenderedItems = [];
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      return { success: false, error: "Every surrendered item must be completed." };
    }
    const item = rawItem as Record<string, unknown>;
    const description = String(item.description ?? "").trim().slice(0, 500);
    const modelBrand = String(item.model ?? "").trim().slice(0, 500);
    const engineSerialNo = String(item.serial ?? "").trim().slice(0, 500);
    const rate = numericValue(String(item.rate ?? ""));
    if (!description || !modelBrand || !engineSerialNo || !Number.isFinite(rate) || rate < 0) {
      return { success: false, error: "Complete the description, model/brand, engine or serial number, and rate for every item." };
    }
    surrenderedItems.push({
      item_description: description,
      model_brand: modelBrand,
      engine_serial_no: engineSerialNo,
      rate,
    });
  }

  const { user, supabase } = await requireUserRole("Credit Investigator");
  let investigationQuery = supabase
    .from("loan_credit_investigations")
    .select("id")
    .eq("loan_id", loanId)
    .eq("credit_investigator_id", user.id);
  if (suppliedInvestigationId) investigationQuery = investigationQuery.eq("id", suppliedInvestigationId);
  const { data: investigation, error: investigationError } = await investigationQuery.maybeSingle();

  if (investigationError || !investigation) {
    console.error("[credit-investigator] Unable to access surrender investigation", {
      loanId,
      suppliedInvestigationId,
      code: investigationError?.code,
      message: investigationError?.message,
    });
    return { success: false, error: "The investigation for this loan could not be accessed." };
  }

  const investigationId = String(investigation.id);
  const objectPath = `${investigationId}/${crypto.randomUUID()}-${safeFileName(image.name, image.type)}`;
  const { error: uploadError } = await supabase.storage
    .from("loan-attestations")
    .upload(objectPath, new Uint8Array(await image.arrayBuffer()), {
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[credit-investigator] Unable to upload signed attestation", {
      investigationId,
      objectPath,
      message: uploadError.message,
    });
    return { success: false, error: `Unable to upload the signed attestation: ${uploadError.message}` };
  }

  const { error: surrenderError } = await supabase.rpc("voluntary_surrender", {
    p_investigation_id: investigationId,
    p_surrendered_items: surrenderedItems,
    p_signed_attestation_image: {
      storage_key: `loan-attestations/${objectPath}`,
      original_name: image.name,
    },
  });

  if (surrenderError) {
    const { error: cleanupError } = await supabase.storage
      .from("loan-attestations")
      .remove([objectPath]);
    console.error("[credit-investigator] Unable to save voluntary surrender", {
      investigationId,
      code: surrenderError.code,
      message: surrenderError.message,
      cleanupError: cleanupError?.message,
    });
    return { success: false, error: `Unable to save the voluntary surrender: ${surrenderError.message}` };
  }

  revalidatePath("/credit-investigator");
  return { success: true, investigationId };
}

export async function saveInvestigationReport(
  loanId: string,
  input: InvestigationReportInput,
): Promise<SaveInvestigationReportResult> {
  const normalizedLoanId = loanId.trim();
  if (!isUuid(normalizedLoanId)) {
    return { success: false, error: "Invalid loan submission." };
  }

  const recommendedAmount = numericValue(input.recommendedAmount);
  if (!Number.isFinite(recommendedAmount) || recommendedAmount < 0) {
    return { success: false, error: "Enter a valid recommended amount." };
  }

  if (!Array.isArray(input.lendingRecords) || input.lendingRecords.length > 50) {
    return { success: false, error: "Other lending records are invalid or exceed the 50-record limit." };
  }

  const otherLending = input.lendingRecords.map((record) => ({
    company: record.company.trim().slice(0, 200),
    loan_amount: numericValue(record.amount),
    installment: numericValue(record.installment),
    remarks: record.remarks.trim().slice(0, 2_000),
    undisclosed: Boolean(record.undisclosed),
  }));
  if (otherLending.some((record) =>
    !Number.isFinite(record.loan_amount) || record.loan_amount < 0 ||
    !Number.isFinite(record.installment) || record.installment < 0
  )) {
    return { success: false, error: "Enter valid amounts for every other lending record." };
  }

  const { supabase } = await requireUserRole("Credit Investigator");
  const businessName = input.businessName.trim().slice(0, 200);
  const businessStatus = input.businessStatus.trim().slice(0, 100);
  const { data, error } = await supabase.rpc("save_loan_credit_investigation", {
    p_business_updates: businessName && businessStatus
      ? [{ business_name: businessName, status: businessStatus }]
      : [],
    p_computations_comments_observations: input.observations.trim().slice(0, 10_000) || null,
    p_insurance_and_deposit_disclosure: {
      selected_option: input.insurance.trim().slice(0, 200) || null,
    },
    p_investigation_date: manilaDate(),
    p_loan_id: normalizedLoanId,
    p_other_lending: otherLending,
    p_other_pending_requirements: input.pendingRequirements.trim().slice(0, 10_000) || null,
    p_plate_no: input.plateNumber.trim().slice(0, 100) || null,
    p_recommended_amount: recommendedAmount,
    p_status: "completed",
  });

  if (error) {
    console.error("[credit-investigator] Unable to save investigation report", {
      loanId: normalizedLoanId,
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      error: `Unable to save the investigation report: ${error.message}`,
    };
  }

  const investigationId = String(data ?? "");
  if (!isUuid(investigationId)) {
    console.error("[credit-investigator] Investigation RPC returned an invalid ID", {
      loanId: normalizedLoanId,
      data,
    });
    return {
      success: false,
      error: "The investigation was saved, but its record ID was not returned.",
    };
  }

  revalidatePath("/credit-investigator");
  return { success: true, investigationId };
}

export async function claimLoanSubmission(
  loanId: string,
): Promise<ClaimLoanResult> {
  const normalizedLoanId = loanId.trim();
  if (!isUuid(normalizedLoanId)) {
    return { success: false, error: "Invalid loan submission." };
  }

  const { supabase } = await requireUserRole("Credit Investigator");
  const claimedAt = new Date().toISOString();
  const { error } = await supabase.rpc("claim_loans", {
    p_loan_id: normalizedLoanId,
  });

  if (error) {
    console.error("[credit-investigator] Unable to claim loan", {
      loanId: normalizedLoanId,
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      error: `Unable to claim this submission: ${error.message}`,
    };
  }

  revalidatePath("/credit-investigator");
  return { success: true, claimedAt };
}

export async function forwardLoanForApproval(
  loanId: string,
  remarks: string,
): Promise<ForwardLoanResult> {
  const normalizedLoanId = loanId.trim();
  if (!isUuid(normalizedLoanId)) {
    return { success: false, error: "Invalid loan submission." };
  }

  const normalizedRemarks = remarks.trim();
  if (normalizedRemarks.length > 5_000) {
    return {
      success: false,
      error: "Remarks must be 5,000 characters or fewer.",
    };
  }

  const { user, supabase } = await requireUserRole("Credit Investigator");
  const { data, error } = await supabase
    .from("loans")
    .update({
      remarks_for_approver: normalizedRemarks || null,
      status: "active",
    })
    .eq("id", normalizedLoanId)
    .eq("claimed_by", user.id)
    .eq("claim_status", "claimed")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[credit-investigator] Unable to forward loan", {
      loanId: normalizedLoanId,
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      error: `Unable to forward this submission: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      error: "This loan is not claimed by you or is no longer available to forward.",
    };
  }

  revalidatePath("/credit-investigator");
  return { success: true };
}

export async function saveCollateralAnalysis(
  loanId: string,
  items: CollateralItemInput[],
  knownInvestigationId?: string,
): Promise<SaveCollateralResult> {
  const normalizedLoanId = loanId.trim();
  if (!isUuid(normalizedLoanId)) {
    return { success: false, error: "Invalid loan submission." };
  }

  if (!Array.isArray(items) || items.length > 50) {
    return { success: false, error: "Collateral items are invalid or exceed the 50-item limit." };
  }

  const collateralItems = [];
  for (const item of items) {
    const description = item.description.trim();
    const rule = collateralAgeRules[item.age];
    const fairMarketValue = numericValue(item.value);

    if (!description || !rule || !Number.isFinite(fairMarketValue) || fairMarketValue < 0) {
      return {
        success: false,
        error: "Complete every collateral description, age range, and fair market value before saving.",
      };
    }

    const depreciatedValue = Math.round(
      fairMarketValue * (1 - rule.ratePercentage / 100) * 100,
    ) / 100;
    collateralItems.push({
      item_description: description,
      age_range: rule.ageRange,
      fair_market_value: fairMarketValue,
      rate_percentage: rule.ratePercentage,
      depreciated_value: depreciatedValue,
    });
  }

  const { user, supabase } = await requireUserRole("Credit Investigator");
  let investigationId = knownInvestigationId?.trim() ?? "";
  if (investigationId && !isUuid(investigationId)) {
    return { success: false, error: "Invalid investigation record." };
  }

  if (!investigationId) {
    const { data: investigation, error: investigationError } = await supabase
      .from("loan_credit_investigations")
      .select("id")
      .eq("loan_id", normalizedLoanId)
      .eq("credit_investigator_id", user.id)
      .maybeSingle();

    if (investigationError) {
      console.error("[credit-investigator] Unable to find investigation", {
        loanId: normalizedLoanId,
        code: investigationError.code,
        message: investigationError.message,
      });
      return {
        success: false,
        error: "Unable to access the investigation for this loan.",
      };
    }

    if (!investigation) {
      return {
        success: false,
        error: "Save the Investigation Report before saving collateral analysis.",
      };
    }
    investigationId = investigation.id;
  }

  const { data, error } = await supabase.rpc("collateral_analysis_insert", {
    p_investigation_id: investigationId,
    p_collateral_items: collateralItems,
  });

  if (error) {
    console.error("[credit-investigator] Unable to save collateral analysis", {
      loanId: normalizedLoanId,
      investigationId,
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      error: "Unable to save the collateral analysis right now. Please try again.",
    };
  }

  revalidatePath("/credit-investigator");
  return { success: true, investigationId: String(data) };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanColumns, loanRowToSubmission, type LoanRow } from "./loans";
import type { Submission } from "./data";

export type ApplicationFormData = Record<string, Record<string, string>>;

export type CreateLoanResult =
  | { ok: true; loan: Submission }
  | { ok: false; error: string };

function cleanText(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function numberValue(value: string | undefined) {
  if (!value) return 0;
  return Number(value.replace(/[^0-9.]/g, "")) || 0;
}

function invalidNumericValue(value: string | undefined) {
  const cleaned = value?.trim();
  if (!cleaned) return false;
  const normalized = cleaned.replace(/PHP|₱|,|\s/gi, "");
  return !/^\d+(?:\.\d+)?$/.test(normalized);
}

function recordRows(section: Record<string, string> | undefined) {
  return Object.keys(section ?? {}).sort((left, right) => Number(left) - Number(right)).flatMap(key => {
    try {
      const value = JSON.parse(section?.[key] ?? "");
      return value && typeof value === "object" && !Array.isArray(value) ? [value as Record<string, string>] : [];
    } catch {
      return [];
    }
  });
}

export async function createLoanApplication(
  form: ApplicationFormData,
): Promise<CreateLoanResult> {
  const { supabase } = await requireUserRole("Credit Analyst");

  const personal = form.personal ?? {};
  const business = form.business ?? {};
  const household = form.household ?? {};
  const relative = form.relative ?? {};
  const loan = form.loan ?? {};
  const other = form.other ?? {};
  const children = recordRows(form.__children);
  const businesses = recordRows(form.__businesses);
  const supportingDocuments = recordRows(form.__documents).map(document => ({ name: document.name ?? "Document", size: document.size ?? "Unknown size" }));
  const firstName = cleanText(personal["First name"]);
  const lastName = cleanText(personal["Last name"]);
  const loanProduct = cleanText(loan["Loan product"])?.toLowerCase();
  const loanAmount = numberValue(loan["Loan amount"]);
  const term = Math.floor(numberValue(loan.Term));

  if (!firstName || !lastName || !loanProduct || loanAmount <= 0 || term <= 0) {
    return {
      ok: false,
      error:
        "First name, last name, loan product, loan amount, and term are required.",
    };
  }


  const numericFields: Array<[string, string | undefined]> = [
    ["Number of children", personal["Number of children"]],
    ["Gross monthly income", business["Gross monthly income"]],
    ["Household years", household.Years],
    ["Monthly income/salary", household["Monthly income/salary"]],
  ];
  const invalidField = numericFields.find(([, value]) => invalidNumericValue(value));
  if (invalidField) {
    return { ok: false, error: `${invalidField[0]} must contain a valid number.` };
  }

  const optionalFields = {
    middle_name: cleanText(personal["Middle name"]),
    date_of_birth: cleanText(personal["Date of birth"]),
    civil_status: cleanText(personal["Civil status"]),
    citizenship: cleanText(personal.Citizenship),
    gender: cleanText(personal.Gender),
    place_of_birth: cleanText(personal["Place of birth"]),
    permanent_address: cleanText(personal["Permanent address"]),
    permanent_barangay: cleanText(personal.Barangay),
    permanent_city_town: cleanText(personal["City/Town"]),
    permanent_zipcode: cleanText(personal["ZIP code"]),
    permanent_region: cleanText(personal.Region),
    present_address: cleanText(personal["Present address"]),
    number_of_children: Math.floor(numberValue(personal["Number of children"])),
    contact_number: cleanText(personal["Contact number"]),
    gross_monthly_income: numberValue(business["Gross monthly income"]) || undefined,
    spouse_name: cleanText(household["Spouse name"]),
    spouse_occupation: cleanText(household.Occupation),
    spouse_company: cleanText(household.Company),
    spouse_years_employed: numberValue(household.Years) || undefined,
    spouse_monthly_income:
      numberValue(household["Monthly income/salary"]) || undefined,
    nearest_relative_name: cleanText(relative.Name),
    nearest_relative_contact_number: cleanText(relative["Contact number"]),
    nearest_relative_address: cleanText(relative.Address),
    real_and_personal_properties: cleanText(other["Real and personal properties owned"]),
    health_declaration: cleanText(other["Health declaration"]),
  };

  const payload = {
    loan_id: `LN-${Date.now().toString().slice(-8)}`,
    first_name: firstName,
    last_name: lastName,
    loan_product: loanProduct,
    loan_amount: loanAmount,
    term,
    status: "pending",
    children,
    businesses,
    supporting_documents: [
      ...supportingDocuments.map(document => ({ ...document, kind: "file" })),
      {
        kind: "application_metadata",
        version: 1,
        emailFacebookAddress: cleanText(personal["Email / Facebook address"]),
        spouseAge: cleanText(household.Age),
        additionalFields: form.__custom ?? {},
      },
    ],
    ...Object.fromEntries(
      Object.entries(optionalFields).filter(([, value]) => value !== undefined),
    ),
  };

  const { data, error } = await supabase
    .from("loans")
    .insert(payload)
    .select(loanColumns)
    .single();

  if (error) {
    console.error("Unable to create loan application", error);
    if (error.code === "23514") {
      return {
        ok: false,
        error: "A selected value is not accepted by the loans table. Please review the loan product and try again.",
      };
    }
    if (error.code === "22P02") {
      return { ok: false, error: "A numeric field contains invalid text. Please enter numbers only and try again." };
    }
    return { ok: false, error: "The application could not be submitted. Please try again." };
  }

  revalidatePath("/credit-analyst");
  return { ok: true, loan: loanRowToSubmission(data as LoanRow) };
}

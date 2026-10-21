"use server";

import { revalidatePath } from "next/cache";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanColumns, loanRowToSubmission, type LoanRow } from "./loans";
import type { CoMakerDetails, Submission } from "./data";
import {
  coMakerColumns,
  coMakerRowToDetails,
  type LoanCoMakerRow,
} from "./co-makers";

export type ApplicationFormData = Record<string, Record<string, string>>;

export type CreateLoanResult =
  | { ok: true; loan: Submission }
  | { ok: false; error: string };

export type CreateCoMakerResult =
  | { ok: true; coMaker: CoMakerDetails }
  | { ok: false; error: string };

export type GetCoMakerResult =
  | { ok: true; coMaker?: CoMakerDetails }
  | { ok: false; error: string };

export type GetCoMakersResult =
  | { ok: true; coMakers: Record<string, CoMakerDetails> }
  | { ok: false; error: string };

function cleanText(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function coMakerPresentAddressStatus(value: string | undefined) {
  const normalized = cleanText(value)?.toLowerCase();

  const statuses: Record<string, string> = {
    rented: "rented",
    "living with parents": "living_with_parents",
    owned: "owned",
    mortgaged: "mortgaged",
    other: "others",
    others: "others",
  };

  return normalized ? statuses[normalized] : undefined;
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

export async function getLoanCoMaker(
  loanId: string,
): Promise<GetCoMakerResult> {
  const { supabase } = await requireUserRole("Credit Analyst");
  if (!loanId) {
    return { ok: false, error: "This loan is not linked to a database record." };
  }

  const { data, error } = await supabase
    .from("loan_co_makers")
    .select(coMakerColumns)
    .eq("loan_id", loanId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load loan co-maker", error);
    return { ok: false, error: "The co-maker details could not be loaded. Please try again." };
  }

  return {
    ok: true,
    coMaker: data ? coMakerRowToDetails(data as LoanCoMakerRow) : undefined,
  };
}

export async function getLoanCoMakers(
  loanIds: string[],
): Promise<GetCoMakersResult> {
  const { supabase } = await requireUserRole("Credit Analyst");
  const uniqueLoanIds = [...new Set(loanIds.filter(Boolean))];
  if (!uniqueLoanIds.length) return { ok: true, coMakers: {} };

  const { data, error } = await supabase
    .from("loan_co_makers")
    .select(coMakerColumns)
    .in("loan_id", uniqueLoanIds);

  if (error) {
    console.error("Unable to refresh loan co-makers", error);
    return { ok: false, error: "The co-maker details could not be refreshed. Please reload the page." };
  }

  return {
    ok: true,
    coMakers: Object.fromEntries(
      ((data ?? []) as LoanCoMakerRow[]).map(row => [
        row.loan_id,
        coMakerRowToDetails(row),
      ]),
    ),
  };
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
    if (error.code === "42501") {
      return {
        ok: false,
        error: "The loan database access policy is incomplete. Ask an administrator to apply the Credit Analyst read and submission policies.",
      };
    }
    return { ok: false, error: "The application could not be submitted. Please try again." };
  }

  revalidatePath("/credit-analyst");
  return { ok: true, loan: loanRowToSubmission(data as LoanRow) };
}

export async function createLoanCoMaker(
  loanId: string,
  form: ApplicationFormData,
): Promise<CreateCoMakerResult> {
  const { supabase } = await requireUserRole("Credit Analyst");
  const personal = form["co-personal"] ?? {};
  const address = form["co-address"] ?? {};
  const household = form["co-household"] ?? {};
  const business = form["co-business"] ?? {};
  const remarks = form["co-remarks"] ?? {};
  const presentAddressStatus = coMakerPresentAddressStatus(
    address["Present address"],
  );
  const homeAddress = cleanText(address["Home address"]);
  const barangay = cleanText(address["Home barangay"]);
  const cityTown = cleanText(address["Home city/town"]);
  const zipCode = cleanText(address["Home ZIP code"]);
  const region = cleanText(address["Home region"]);
  const fullName =
    cleanText(personal["Full name"]) ??
    cleanText(
      [personal["First name"], personal["Middle name"], personal["Last name"]]
        .map(value => value?.trim())
        .filter(Boolean)
        .join(" "),
    );

  if (
    !loanId ||
    !fullName ||
    !homeAddress ||
    !barangay ||
    !cityTown ||
    !zipCode ||
    !region ||
    !presentAddressStatus
  ) {
    return {
      ok: false,
      error:
        "The loan, co-maker's full name, home address, barangay, city/town, ZIP code, region, and present address status are required.",
    };
  }

  const numberOfChildren = household["Number of children"];
  const grossMonthlyIncome = business["Gross monthly income"];
  const invalidField = [
    ["Number of children", numberOfChildren],
    ["Gross monthly income", grossMonthlyIncome],
  ].find(([, value]) => invalidNumericValue(value));

  if (invalidField) {
    return { ok: false, error: `${invalidField[0]} must contain a valid number.` };
  }

  const optionalFields = {
    date_of_birth: cleanText(personal["Date of birth"]),
    civil_status: cleanText(personal["Civil status"]),
    citizenship: cleanText(personal.Citizenship),
    gender: cleanText(personal.Gender),
    place_of_birth: cleanText(personal["Place of birth"]),
    contact_number: cleanText(personal["Contact number"]),
    email: cleanText(personal["Email / Facebook address"]),
    relationship_to_borrower: cleanText(personal["Relationship to borrower"]),
    provincial_address: cleanText(address["Provincial address"]),
    provincial_barangay: cleanText(address["Provincial barangay"]),
    provincial_city_town: cleanText(address["Provincial city/town"]),
    provincial_zip_code: cleanText(address["Provincial ZIP code"]),
    provincial_region: cleanText(address["Provincial region"]),
    number_of_children: numberValue(numberOfChildren) || undefined,
    children: recordRows(form.__children),
    businesses: recordRows(form.__businesses),
    gross_monthly_income: numberValue(grossMonthlyIncome) || undefined,
    overall_remarks: cleanText(remarks["Overall remarks"]),
  };

  const { data, error } = await supabase
    .from("loan_co_makers")
    .insert({
      loan_id: loanId,
      full_name: fullName,
      home_address: homeAddress,
      present_address: homeAddress,
      present_address_status: presentAddressStatus,
      barangay,
      city_town: cityTown,
      zip_code: zipCode,
      region,
      ...Object.fromEntries(
        Object.entries(optionalFields).filter(([, value]) => value !== undefined),
      ),
    })
    .select(coMakerColumns)
    .single();

  if (error) {
    console.error("Unable to create loan co-maker", error);
    if (error.code === "23503") {
      return { ok: false, error: "The selected loan no longer exists." };
    }
    if (error.code === "23505") {
      return { ok: false, error: "A co-maker is already attached to this loan." };
    }
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to add a co-maker." };
    }
    if (error.code === "23514") {
      return {
        ok: false,
        error: "The selected present address status is not accepted. Please choose a status and try again.",
      };
    }
    return { ok: false, error: "The co-maker could not be saved. Please try again." };
  }

  revalidatePath("/credit-analyst");
  return {
    ok: true,
    coMaker: coMakerRowToDetails(data as LoanCoMakerRow),
  };
}

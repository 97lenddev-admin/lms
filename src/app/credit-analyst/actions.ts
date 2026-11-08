"use server";

import { revalidatePath } from "next/cache";
import { requireUserRole } from "@/lib/supabase/require-user";
import { idPictureDetails, loanColumns, loanRowToSubmission, type LoanRow } from "./loans";
import type { CoMakerDetails, IdPictureMetadata, Submission } from "./data";
import {
  coMakerColumns,
  coMakerRowToDetails,
  type LoanCoMakerRow,
} from "./co-makers";
import { cashFlowFieldLabels, cashFlowFields } from "./cash-flow";

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

export type LoanDocumentResult =
  | { ok: true; document: { name: string; size: string; path: string } }
  | { ok: false; error: string };

export type LoanDocumentUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const loanDocumentBucket = "loan-application-documents";
const allowedLoanDocumentTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);
const allowedIdPictureTypes = new Set(["image/png", "image/jpeg"]);

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

function isAtLeastAge(value: string | undefined, minimumAge: number) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const dateOfBirth = new Date(year, month - 1, day);
  if (
    dateOfBirth.getFullYear() !== year ||
    dateOfBirth.getMonth() !== month - 1 ||
    dateOfBirth.getDate() !== day
  ) return false;

  const latestAllowedBirthDate = new Date();
  latestAllowedBirthDate.setHours(0, 0, 0, 0);
  latestAllowedBirthDate.setFullYear(latestAllowedBirthDate.getFullYear() - minimumAge);
  return dateOfBirth <= latestAllowedBirthDate;
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

function idPictureFromSection(
  section: Record<string, string> | undefined,
  kind: IdPictureMetadata["kind"],
): IdPictureMetadata | undefined {
  try {
    const picture = JSON.parse(section?.__picture ?? "");
    if (
      picture &&
      typeof picture === "object" &&
      !Array.isArray(picture) &&
      typeof picture.name === "string" &&
      typeof picture.size === "string" &&
      typeof picture.path === "string"
    ) {
      return { kind, name: picture.name, size: picture.size, path: picture.path };
    }
  } catch {
    // An empty or invalid client value is treated as no picture.
  }
  return undefined;
}

function displayFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export async function uploadLoanDocument(formData: FormData): Promise<LoanDocumentResult> {
  const { user, supabase } = await requireUserRole("Credit Analyst");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Select a document to upload." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: `${file.name} is larger than 5 MB.` };
  }
  if (!allowedLoanDocumentTypes.has(file.type)) {
    return { ok: false, error: `${file.name} must be a PDF, PNG, or JPG file.` };
  }

  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120) || "document";
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(loanDocumentBucket)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Unable to upload loan application document", error);
    if (error.statusCode === "404" || error.message === "Bucket not found") {
      return { ok: false, error: "Document storage is not configured yet. Apply the loan application documents migration, then try again." };
    }
    return { ok: false, error: `${file.name} could not be uploaded. Please try again.` };
  }

  return {
    ok: true,
    document: { name: file.name, size: displayFileSize(file.size), path },
  };
}

export async function uploadLoanIdPicture(formData: FormData): Promise<LoanDocumentResult> {
  const { user, supabase } = await requireUserRole("Credit Analyst");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Select a 2x2 picture to upload." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: `${file.name} is larger than 5 MB.` };
  }
  if (!allowedIdPictureTypes.has(file.type)) {
    return { ok: false, error: `${file.name} must be a PNG or JPG image.` };
  }

  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120) || "2x2-picture";
  const path = `${user.id}/id-pictures/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(loanDocumentBucket)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Unable to upload loan ID picture", error);
    return { ok: false, error: "The 2x2 picture could not be uploaded. Please try again." };
  }

  return {
    ok: true,
    document: { name: file.name, size: displayFileSize(file.size), path },
  };
}

export async function deleteLoanDocument(path: string) {
  const { user, supabase } = await requireUserRole("Credit Analyst");
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return { ok: false, error: "This document cannot be removed." } as const;
  }
  const { error } = await supabase.storage.from(loanDocumentBucket).remove([path]);
  if (error) {
    console.error("Unable to delete loan application document", error);
    return { ok: false, error: "The document could not be removed. Please try again." } as const;
  }
  return { ok: true } as const;
}

export async function createLoanDocumentViewUrl(path: string): Promise<LoanDocumentUrlResult> {
  const { supabase } = await requireUserRole("Credit Analyst");
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { ok: false, error: "This document link is invalid." };
  }
  const { data, error } = await supabase.storage
    .from(loanDocumentBucket)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    console.error("Unable to create loan application document URL", error);
    return { ok: false, error: "The document could not be opened. Please try again." };
  }
  return { ok: true, url: data.signedUrl };
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

  const { data: loanPicture, error: pictureError } = data
    ? await supabase.from("loans").select("id_pictures").eq("id", loanId).maybeSingle()
    : { data: null, error: null };
  if (pictureError) console.error("Unable to load co-maker ID picture", pictureError);
  const idPicture = idPictureDetails(loanPicture?.id_pictures).find(picture => picture.kind === "co_maker_2x2");

  return {
    ok: true,
    coMaker: data ? { ...coMakerRowToDetails(data as LoanCoMakerRow), idPicture } : undefined,
  };
}

export async function getLoanCoMakers(
  loanIds: string[],
): Promise<GetCoMakersResult> {
  const { supabase } = await requireUserRole("Credit Analyst");
  const uniqueLoanIds = [...new Set(loanIds.filter(Boolean))];
  if (!uniqueLoanIds.length) return { ok: true, coMakers: {} };

  const [{ data, error }, { data: pictureRows, error: pictureError }] = await Promise.all([
    supabase.from("loan_co_makers").select(coMakerColumns).in("loan_id", uniqueLoanIds),
    supabase.from("loans").select("id, id_pictures").in("id", uniqueLoanIds),
  ]);

  if (error) {
    console.error("Unable to refresh loan co-makers", error);
    return { ok: false, error: "The co-maker details could not be refreshed. Please reload the page." };
  }
  if (pictureError) console.error("Unable to refresh co-maker ID pictures", pictureError);
  const picturesByLoanId = new Map(
    (pictureRows ?? []).map(row => [
      String(row.id),
      idPictureDetails(row.id_pictures).find(picture => picture.kind === "co_maker_2x2"),
    ]),
  );

  return {
    ok: true,
    coMakers: Object.fromEntries(
      ((data ?? []) as LoanCoMakerRow[]).map(row => [
        row.loan_id,
        { ...coMakerRowToDetails(row), idPicture: picturesByLoanId.get(row.loan_id) },
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
  const cashFlow = form.cashflow ?? {};
  const children = recordRows(form.__children);
  const businesses = recordRows(form.__businesses);
  const supportingDocuments = recordRows(form.__documents).map(document => ({
    name: document.name ?? "Document",
    size: document.size ?? "Unknown size",
    ...(document.path ? { path: document.path } : {}),
  }));
  const applicantPicture = idPictureFromSection(personal, "applicant_2x2");
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

  if (!isAtLeastAge(personal["Date of birth"], 18)) {
    return { ok: false, error: "The applicant must be at least 18 years old." };
  }


  const numericFields: Array<[string, string | undefined]> = [
    ["Number of children", personal["Number of children"]],
    ["Gross monthly income", business["Gross monthly income"]],
    ["Spouse age", household.Age],
    ["Household years", household.Years],
    ["Monthly income/salary", household["Monthly income/salary"]],
    ...cashFlowFieldLabels.map((field): [string, string | undefined] => [field, cashFlow[field]]),
  ];
  const invalidField = numericFields.find(([, value]) => invalidNumericValue(value));
  if (invalidField) {
    return { ok: false, error: `${invalidField[0]} must contain a valid number.` };
  }


  const spouseFields = [
    household["Spouse name"],
    household.Occupation,
    household.Age,
    household.Company,
    household.Years,
    household["Monthly income/salary"],
  ];
  if (cleanText(personal["Civil status"])?.toLowerCase() === "married" && spouseFields.some(value => !cleanText(value))) {
    return { ok: false, error: "Complete all spouse details for a married applicant." };
  }
  if (cleanText(household.Age) && numberValue(household.Age) < 18) {
    return { ok: false, error: "The applicant's spouse must be at least 18 years old." };
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
  const cashFlowColumns = Object.fromEntries(
    cashFlowFields.flatMap(({ label, applicationKey, databaseColumn }) =>
      databaseColumn
        ? [[databaseColumn, numberValue(cashFlow[applicationKey ?? label])]]
        : [],
    ),
  );

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
        cashFlow,
        additionalFields: form.__custom ?? {},
      },
    ],
    id_pictures: JSON.stringify(applicantPicture ? [applicantPicture] : []),
    ...cashFlowColumns,
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
  const coMakerPicture = idPictureFromSection(personal, "co_maker_2x2");
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


  if (!isAtLeastAge(personal["Date of birth"], 18)) {
    return { ok: false, error: "The co-maker must be at least 18 years old." };
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

  let previousIdPictures: string | null | undefined;
  if (coMakerPicture) {
    const { data: loanRecord, error: loanError } = await supabase
      .from("loans")
      .select("id_pictures")
      .eq("id", loanId)
      .maybeSingle();
    if (loanError || !loanRecord) {
      console.error("Unable to load loan ID pictures", loanError);
      return { ok: false, error: "The loan's 2x2 pictures could not be loaded. Please try again." };
    }
    previousIdPictures = loanRecord.id_pictures;
    const nextPictures = [
      ...idPictureDetails(previousIdPictures).filter(picture => picture.kind !== "co_maker_2x2"),
      coMakerPicture,
    ];
    const { data: updatedLoan, error: pictureError } = await supabase
      .from("loans")
      .update({ id_pictures: JSON.stringify(nextPictures) })
      .eq("id", loanId)
      .select("id")
      .maybeSingle();
    if (pictureError || !updatedLoan) {
      console.error("Unable to save co-maker ID picture", pictureError);
      return { ok: false, error: "The co-maker's 2x2 picture could not be saved. Apply the ID picture update policy, then try again." };
    }
  }

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
    if (coMakerPicture && previousIdPictures !== undefined) {
      const { error: rollbackError } = await supabase
        .from("loans")
        .update({ id_pictures: previousIdPictures })
        .eq("id", loanId);
      if (rollbackError) console.error("Unable to roll back co-maker ID picture", rollbackError);
    }
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
    coMaker: { ...coMakerRowToDetails(data as LoanCoMakerRow), idPicture: coMakerPicture },
  };
}

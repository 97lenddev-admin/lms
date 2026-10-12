import type { Submission, SubmissionStatus } from "./data";

export type LoanRow = {
  id: string;
  loan_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string | null;
  civil_status: string | null;
  citizenship: string | null;
  gender: string | null;
  place_of_birth: string | null;
  permanent_address: string | null;
  permanent_barangay: string | null;
  permanent_city_town: string | null;
  permanent_zipcode: string | null;
  permanent_region: string | null;
  present_address: string | null;
  number_of_children: number | string | null;
  contact_number: string | null;
  children: unknown;
  businesses: unknown;
  gross_monthly_income: number | string | null;
  spouse_name: string | null;
  spouse_occupation: string | null;
  spouse_company: string | null;
  spouse_years_employed: number | string | null;
  spouse_monthly_income: number | string | null;
  nearest_relative_name: string | null;
  nearest_relative_contact_number: string | null;
  nearest_relative_address: string | null;
  real_and_personal_properties: string | null;
  health_declaration: string | null;
  supporting_documents: unknown;
  loan_product: string;
  loan_amount: number | string;
  term: number;
  status: string;
  created_at: string;
};

export const loanColumns =
  "id, loan_id, first_name, middle_name, last_name, date_of_birth, civil_status, citizenship, gender, place_of_birth, permanent_address, permanent_barangay, permanent_city_town, permanent_zipcode, permanent_region, present_address, number_of_children, contact_number, children, businesses, gross_monthly_income, spouse_name, spouse_occupation, spouse_company, spouse_years_employed, spouse_monthly_income, nearest_relative_name, nearest_relative_contact_number, nearest_relative_address, real_and_personal_properties, health_declaration, supporting_documents, loan_product, loan_amount, term, status, created_at";

const statuses: SubmissionStatus[] = [
  "Active",
  "Approved",
  "Pending",
  "Rejected",
  "Inactive",
];

function normalizeStatus(status: string): SubmissionStatus {
  const normalized = `${status.slice(0, 1).toUpperCase()}${status.slice(1).toLowerCase()}`;
  return statuses.includes(normalized as SubmissionStatus)
    ? (normalized as SubmissionStatus)
    : "Pending";
}

function formatLoanProduct(product: string) {
  return product
    .split("-")
    .map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join("-");
}

function recordRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, string> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
}

function documentDetails(value: unknown) {
  const empty = { files: [] as { name: string; size: string }[], emailFacebookAddress: undefined as string | undefined, spouseAge: undefined as string | undefined, additionalFields: {} as Record<string, string> };
  if (Array.isArray(value)) {
    const metadata = value.find(item => item && typeof item === "object" && !Array.isArray(item) && "kind" in item && item.kind === "application_metadata") as { emailFacebookAddress?: unknown; spouseAge?: unknown; additionalFields?: unknown } | undefined;
    return {
      files: value.filter((file): file is { name: string; size: string } => Boolean(file) && typeof file === "object" && "name" in file && "size" in file && (!("kind" in file) || file.kind !== "application_metadata")),
      emailFacebookAddress: typeof metadata?.emailFacebookAddress === "string" ? metadata.emailFacebookAddress : undefined,
      spouseAge: typeof metadata?.spouseAge === "string" ? metadata.spouseAge : undefined,
      additionalFields: metadata?.additionalFields && typeof metadata.additionalFields === "object" && !Array.isArray(metadata.additionalFields) ? metadata.additionalFields as Record<string, string> : {},
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const manifest = value as { files?: unknown; emailFacebookAddress?: unknown; spouseAge?: unknown; additionalFields?: unknown };
  return {
    files: Array.isArray(manifest.files) ? manifest.files.filter((file): file is { name: string; size: string } => Boolean(file) && typeof file === "object" && "name" in file && "size" in file) : [],
    emailFacebookAddress: typeof manifest.emailFacebookAddress === "string" ? manifest.emailFacebookAddress : undefined,
    spouseAge: typeof manifest.spouseAge === "string" ? manifest.spouseAge : undefined,
    additionalFields: manifest.additionalFields && typeof manifest.additionalFields === "object" && !Array.isArray(manifest.additionalFields) ? manifest.additionalFields as Record<string, string> : {},
  };
}

export function loanRowToSubmission(row: LoanRow, hasCoMaker = false): Submission {
  const middleName = row.middle_name?.trim();
  const givenNames = [row.first_name, middleName].filter(Boolean).join(" ");
  const documents = documentDetails(row.supporting_documents);

  const currency = (value: number | string | null) => value == null ? undefined : new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0).replace("PHP", "₱").trim();

  return {
    databaseId: row.id,
    id: row.loan_id || row.id,
    name: [row.last_name, givenNames].filter(Boolean).join(", "),
    amount: new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    })
      .format(Number(row.loan_amount) || 0)
      .replace("PHP", "₱")
      .trim(),
    term: `${row.term} ${row.term === 1 ? "day" : "days"}`,
    product: formatLoanProduct(row.loan_product),
    submitted: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(row.created_at)),
    status: normalizeStatus(row.status),
    hasCoMaker,
    details: {
      firstName: row.first_name,
      middleName: middleName || undefined,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth || undefined,
      civilStatus: row.civil_status || undefined,
      citizenship: row.citizenship || undefined,
      gender: row.gender || undefined,
      placeOfBirth: row.place_of_birth || undefined,
      permanentAddress: row.permanent_address || undefined,
      permanentBarangay: row.permanent_barangay || undefined,
      permanentCityTown: row.permanent_city_town || undefined,
      permanentZipcode: row.permanent_zipcode || undefined,
      permanentRegion: row.permanent_region || undefined,
      presentAddress: row.present_address || undefined,
      numberOfChildren: row.number_of_children == null ? undefined : String(row.number_of_children),
      contactNumber: row.contact_number || undefined,
      emailFacebookAddress: documents.emailFacebookAddress,
      children: recordRows(row.children),
      businesses: recordRows(row.businesses),
      grossMonthlyIncome: currency(row.gross_monthly_income),
      spouseName: row.spouse_name || undefined,
      spouseOccupation: row.spouse_occupation || undefined,
      spouseAge: documents.spouseAge,
      spouseCompany: row.spouse_company || undefined,
      spouseYearsEmployed: row.spouse_years_employed == null ? undefined : String(row.spouse_years_employed),
      spouseMonthlyIncome: currency(row.spouse_monthly_income),
      relativeName: row.nearest_relative_name || undefined,
      relativeContactNumber: row.nearest_relative_contact_number || undefined,
      relativeAddress: row.nearest_relative_address || undefined,
      realAndPersonalProperties: row.real_and_personal_properties || undefined,
      healthDeclaration: row.health_declaration || undefined,
      supportingDocuments: documents.files,
      additionalFields: documents.additionalFields,
    },
  };
}

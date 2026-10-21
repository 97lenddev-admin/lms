import type { CoMakerDetails } from "./data";

export type LoanCoMakerRow = {
  loan_id: string;
  full_name: string;
  date_of_birth: string | null;
  civil_status: string | null;
  citizenship: string | null;
  gender: string | null;
  place_of_birth: string | null;
  contact_number: string | null;
  email: string | null;
  relationship_to_borrower: string | null;
  home_address: string;
  present_address: string | null;
  present_address_status: string | null;
  barangay: string;
  city_town: string;
  zip_code: string;
  region: string;
  provincial_address: string | null;
  provincial_barangay: string | null;
  provincial_city_town: string | null;
  provincial_zip_code: string | null;
  provincial_region: string | null;
  number_of_children: number | string | null;
  children: unknown;
  businesses: unknown;
  gross_monthly_income: number | string | null;
  overall_remarks: string | null;
};

export const coMakerColumns =
  "loan_id, full_name, date_of_birth, civil_status, citizenship, gender, place_of_birth, contact_number, email, relationship_to_borrower, home_address, present_address, present_address_status, barangay, city_town, zip_code, region, provincial_address, provincial_barangay, provincial_city_town, provincial_zip_code, provincial_region, number_of_children, children, businesses, gross_monthly_income, overall_remarks";

function optionalText(value: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function recordRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Record<string, string> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

function addressStatus(value: string | null) {
  const normalized = optionalText(value)?.replaceAll("_", " ");
  if (!normalized) return undefined;
  return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
}

function currency(value: number | string | null) {
  if (value == null || value === "") return undefined;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(Number(value) || 0)
    .replace("PHP", "₱")
    .trim();
}

export function coMakerRowToDetails(row: LoanCoMakerRow): CoMakerDetails {
  return {
    fullName: row.full_name,
    dateOfBirth: optionalText(row.date_of_birth),
    civilStatus: optionalText(row.civil_status),
    citizenship: optionalText(row.citizenship),
    gender: optionalText(row.gender),
    placeOfBirth: optionalText(row.place_of_birth),
    contactNumber: optionalText(row.contact_number),
    email: optionalText(row.email),
    relationshipToBorrower: optionalText(row.relationship_to_borrower),
    homeAddress: row.home_address,
    presentAddress: optionalText(row.present_address),
    presentAddressStatus: addressStatus(row.present_address_status),
    barangay: row.barangay,
    cityTown: row.city_town,
    zipCode: row.zip_code,
    region: row.region,
    provincialAddress: optionalText(row.provincial_address),
    provincialBarangay: optionalText(row.provincial_barangay),
    provincialCityTown: optionalText(row.provincial_city_town),
    provincialZipCode: optionalText(row.provincial_zip_code),
    provincialRegion: optionalText(row.provincial_region),
    numberOfChildren:
      row.number_of_children == null ? undefined : String(row.number_of_children),
    children: recordRows(row.children),
    businesses: recordRows(row.businesses),
    grossMonthlyIncome: currency(row.gross_monthly_income),
    overallRemarks: optionalText(row.overall_remarks),
  };
}

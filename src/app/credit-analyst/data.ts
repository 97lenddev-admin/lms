export type SubmissionStatus =
  | "Active"
  | "Approved"
  | "Pending"
  | "Rejected"
  | "Inactive";

export type Submission = {
  id: string;
  name: string;
  amount: string;
  term: string;
  submitted: string;
  status: SubmissionStatus;
  hasCoMaker?: boolean;
};

export type FormSection = {
  id: string;
  title: string;
  summary: string;
  fields?: string[];
};

const firstPageSubmissions: Submission[] = [
  { id: "LN-0023", name: "Reyes, Juan", amount: "₱60,000.00", term: "60 days", submitted: "Mar 5, 2026", status: "Active" },
  { id: "LN-0087", name: "Cruz, Maria", amount: "₱100,000.00", term: "90 days", submitted: "Nov 18, 2025", status: "Approved", hasCoMaker: true },
  { id: "LN-0142", name: "Garcia, Jose", amount: "₱60,000.00", term: "90 days", submitted: "Jul 22, 2025", status: "Pending" },
  { id: "LN-0056", name: "Dela Cruz, Ana", amount: "₱50,000.00", term: "60 days", submitted: "Jan 30, 2026", status: "Rejected" },
  { id: "LN-0319", name: "Ramos, Pedro", amount: "₱60,000.00", term: "60 days", submitted: "Sep 9, 2025", status: "Inactive" },
  { id: "LN-0204", name: "Villanueva, Luz", amount: "₱100,000.00", term: "90 days", submitted: "Apr 14, 2026", status: "Approved" },
  { id: "LN-0078", name: "Mendoza, Carlos", amount: "₱60,000.00", term: "90 days", submitted: "Dec 3, 2025", status: "Pending" },
  { id: "LN-0533", name: "Bautista, Rosa", amount: "₱50,000.00", term: "60 days", submitted: "Feb 27, 2026", status: "Rejected" },
  { id: "LN-0411", name: "Aquino, Miguel", amount: "₱60,000.00", term: "60 days", submitted: "Jun 11, 2025", status: "Approved" },
  { id: "LN-0266", name: "Soriano, Elena", amount: "₱100,000.00", term: "90 days", submitted: "Oct 1, 2025", status: "Approved" },
];

const additionalBorrowers = [
  "Santos, Roberto", "Flores, Angela", "Navarro, Luis", "Castillo, Maribel",
  "Domingo, Rafael", "Mercado, Teresa", "Valdez, Ernesto", "Pascual, Lorna",
  "Salazar, Dennis", "Manalo, Grace", "Tolentino, Marco", "Evangelista, Ruth",
  "Rosales, Antonio", "Miranda, Sofia", "Abad, Lorenzo", "Padilla, Carmen",
  "Aguilar, Noel", "Francisco, Irene", "De Guzman, Paolo", "Rivera, Bianca",
];

const additionalDates = [
  "May 29, 2026", "May 26, 2026", "May 20, 2026", "May 14, 2026",
  "May 8, 2026", "Apr 30, 2026", "Apr 22, 2026", "Apr 16, 2026",
  "Apr 9, 2026", "Apr 2, 2026", "Mar 28, 2026", "Mar 21, 2026",
  "Mar 14, 2026", "Mar 8, 2026", "Feb 24, 2026", "Feb 16, 2026",
  "Feb 8, 2026", "Jan 27, 2026", "Jan 18, 2026", "Jan 9, 2026",
];

const additionalStatuses: SubmissionStatus[] = [
  "Pending", "Active", "Approved", "Rejected", "Approved",
  "Inactive", "Active", "Pending", "Approved", "Rejected",
];

// Three pages of replaceable demo records. Page one mirrors the supplied design.
export const submissions: Submission[] = Array.from({ length: 3 }, (_, page) =>
  firstPageSubmissions.map((submission, index) => {
    if (page === 0) return submission;

    const dataIndex = (page - 1) * 10 + index;
    return {
      id: `LN-${String(page * 1000 + index + 1).padStart(4, "0")}`,
      name: additionalBorrowers[dataIndex],
      amount: ["₱35,000.00", "₱45,000.00", "₱75,000.00", "₱80,000.00", "₱120,000.00"][dataIndex % 5],
      term: ["45 days", "60 days", "75 days", "90 days"][dataIndex % 4],
      submitted: additionalDates[dataIndex],
      status: additionalStatuses[dataIndex % additionalStatuses.length],
      hasCoMaker: dataIndex % 6 === 1,
    };
  }),
).flat();

export const applicationSections: FormSection[] = [
  { id: "personal", title: "Personal information", summary: "", fields: ["Last name", "First name", "Middle name", "Date of birth", "Age", "Civil status", "Citizenship", "Gender", "Place of birth", "Permanent address", "Barangay", "City/Town", "ZIP code", "Region", "Contact number", "Email / Facebook address"] },
  { id: "business", title: "Business information", summary: "", fields: ["Business name", "Type", "Address", "Years", "Gross monthly income"] },
  { id: "household", title: "Household information", summary: "", fields: ["Spouse name", "Occupation", "Age", "Company", "Years", "Monthly income/salary"] },
  { id: "other", title: "Other information", summary: "", fields: ["Real and personal properties owned"] },
  { id: "relative", title: "Nearest relative to contact", summary: "", fields: ["Name", "Contact number", "Address"] },
  { id: "loan", title: "Loan details", summary: "", fields: ["Loan product", "Loan amount", "Term"] },
  { id: "documents", title: "Supporting documents", summary: "2 files · no note added" },
  { id: "schedule", title: "Payment schedule", summary: "Set loan details first" },
];

export const coMakerSections: FormSection[] = [
  { id: "co-personal", title: "Personal information", summary: "Santos, Roberto D. · Sibling", fields: ["Age", "Civil status", "Date of birth", "Citizenship", "Gender", "Place of birth", "Contact number", "Email / Facebook address", "Relationship to borrower"] },
  { id: "co-address", title: "Address", summary: "Home + provincial · Owned", fields: ["Home address", "Home barangay", "Home city/town", "Home ZIP code", "Home region", "Provincial address", "Provincial barangay", "Provincial city/town", "Provincial ZIP code", "Provincial region", "Present address", "Number of children"] },
  { id: "co-household", title: "Household information", summary: "2 children", fields: ["Spouse name", "Occupation", "Age", "Company", "Years", "Monthly income/salary", "Child name", "School", "Grade/Course", "Birthday", "Child age"] },
  { id: "co-business", title: "Business information", summary: "Business, type, income", fields: ["Business name", "Type", "Address", "Years", "Gross monthly income"] },
  { id: "co-remarks", title: "Overall remarks", summary: "Your notes on this co-maker", fields: ["Overall remarks"] },
];

export const documents = [
  { name: "Business Permit.pdf", meta: "200 KB · 100%" },
  { name: "Driver’s License (FRONT).png", meta: "2 MB · 40%" },
  { name: "Driver’s License (BACK).png", meta: "4.2 MB · 80%" },
];

export const paymentRows = Array.from({ length: 60 }, (_, index) => ({
  number: String(index + 1).padStart(3, "0"),
  date: new Date(2026, 5, 24 + index).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
  amount: "₱1,000.00",
}));

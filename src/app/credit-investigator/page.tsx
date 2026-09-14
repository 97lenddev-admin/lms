import type { Metadata } from "next";
import CreditInvestigatorApp from "./credit-investigator-app";

export const metadata: Metadata = {
  title: "Credit Investigator | LMS",
  description: "Review, claim, and forward loan applications.",
};

export default function CreditInvestigatorPage() {
  return <CreditInvestigatorApp />;
}

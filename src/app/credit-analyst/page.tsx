import type { Metadata } from "next";
import CreditAnalystApp from "./credit-analyst-app";

export const metadata: Metadata = {
  title: "Credit Analyst | LMS",
  description: "Create, review, and manage loan applications.",
};

export default function CreditAnalystPage() {
  return <CreditAnalystApp />;
}

import type { Metadata } from "next";
import { requireUserRole } from "@/lib/supabase/require-user";
import { loanColumns, loanRowToSubmission, type LoanRow } from "../credit-analyst/loans";
import BranchManagerApp from "./branch-manager-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Branch Manager | LMS", description: "Masterlist of loan submissions." };

export default async function BranchManagerPage() {
  const { profile, supabase } = await requireUserRole("Branch Manager");
  const { data, error } = await supabase
    .from("loans")
    .select(loanColumns)
    .order("created_at", { ascending: false });

  if (error) console.error("Unable to load Branch Manager loans", error);

  return (
    <BranchManagerApp
      userProfile={profile}
      initialSubmissions={((data ?? []) as LoanRow[]).map(row => loanRowToSubmission(row))}
      loadError={error ? "Unable to load loan submissions right now. Please try again later." : undefined}
    />
  );
}

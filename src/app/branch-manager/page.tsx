import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/require-user";
import BranchManagerApp from "./branch-manager-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Branch Manager | LMS", description: "Masterlist of loan submissions." };

export default async function BranchManagerPage() {
  await requireUser();
  return <BranchManagerApp />;
}

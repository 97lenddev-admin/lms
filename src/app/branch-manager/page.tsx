import type { Metadata } from "next";
import { requireUserRole } from "@/lib/supabase/require-user";
import BranchManagerApp from "./branch-manager-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Branch Manager | LMS", description: "Masterlist of loan submissions." };

export default async function BranchManagerPage() {
  const { profile } = await requireUserRole("Branch Manager");
  return <BranchManagerApp userProfile={profile} />;
}

import type { Metadata } from "next";
import { requireUserRole } from "@/lib/supabase/require-user";
import CashierApp from "./cashier-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cashier | LMS",
  description: "Record client payments and release approved loan funds.",
};

export default async function CashierPage() {
  const { profile } = await requireUserRole("Cashier");
  return <CashierApp userProfile={profile} />;
}

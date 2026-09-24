import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/require-user";
import CashierApp from "./cashier-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cashier | LMS",
  description: "Record client payments and release approved loan funds.",
};

export default async function CashierPage() {
  await requireUser();
  return <CashierApp />;
}

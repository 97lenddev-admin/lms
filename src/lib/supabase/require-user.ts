import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./config";
import { createClient } from "./server";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/log-in");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/log-in");
  return data.user;
}

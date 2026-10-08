import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./config";
import { createClient } from "./server";
import {
  getUserProfile,
  roleHomePaths,
  type AuthenticatedUserProfile,
  type UserRole,
} from "./user-role";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/log-in");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/log-in");
  return data.user;
}

export async function requireUserRole(requiredRole: UserRole) {
  if (!isSupabaseConfigured()) redirect("/log-in");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/log-in");

  let profile: AuthenticatedUserProfile | null = null;

  try {
    profile = await getUserProfile(supabase, data.user.id);
  } catch (profileError) {
    console.error("[authorization] Unable to load user profile", profileError);
  }

  if (!profile) redirect("/log-in");
  if (profile.homePath !== roleHomePaths[requiredRole]) redirect(profile.homePath);

  return { user: data.user, supabase, profile };
}

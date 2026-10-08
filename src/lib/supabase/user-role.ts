import type { SupabaseClient } from "@supabase/supabase-js";

export const roleHomePaths = {
  "Credit Analyst": "/credit-analyst",
  "Credit Investigator": "/credit-investigator",
  "Branch Manager": "/branch-manager",
  Cashier: "/cashier",
} as const;

export type UserRole = keyof typeof roleHomePaths;
export type UserHomePath = (typeof roleHomePaths)[UserRole];
export type UserProfileIdentity = {
  fullName: string;
  role: UserRole;
};

export type AuthenticatedUserProfile = UserProfileIdentity & {
  homePath: UserHomePath;
};

export function getRoleHomePath(role: unknown): UserHomePath | null {
  if (typeof role !== "string") return null;

  const normalizedRole = role.trim() as UserRole;
  return roleHomePaths[normalizedRole] ?? null;
}

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthenticatedUserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("full_name, roles")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const homePath = getRoleHomePath(data?.roles);
  if (!homePath || typeof data?.roles !== "string") return null;

  const fullName =
    typeof data.full_name === "string" && data.full_name.trim()
      ? data.full_name.trim()
      : "User";

  return {
    fullName,
    role: data.roles.trim() as UserRole,
    homePath,
  };
}

export async function getUserHomePath(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserHomePath | null> {
  return (await getUserProfile(supabase, userId))?.homePath ?? null;
}

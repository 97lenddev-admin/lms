"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { rememberCookie } from "@/lib/supabase/cookies";
import { createClient } from "@/lib/supabase/server";
import { getUserHomePath, type UserHomePath } from "@/lib/supabase/user-role";

export type LoginState = {
  error: string;
};

function authErrorMessage(code?: string, message?: string, status?: number) {
  if (code === "invalid_credentials") return "Incorrect email or password.";
  if (code === "email_not_confirmed") return "Please confirm your email before signing in.";
  if (code === "over_request_rate_limit") return "Too many sign-in attempts. Please wait a moment and try again.";
  if (process.env.NODE_ENV === "development" && message) {
    const details = [code, status].filter(Boolean).join(" / ");
    return `${message}${details ? ` (${details})` : ""}`;
  }
  return "Unable to sign in. Please try again.";
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  const maxAge = 30 * 86400;

  cookieStore.set(rememberCookie, remember ? String(Date.now() + maxAge * 1000) : "", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: remember ? maxAge : 0,
  });

  const supabase = await createClient();
  let authResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

  try {
    authResult = await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    console.error("[login] Supabase sign-in request failed", error);
    cookieStore.delete(rememberCookie);
    return { error: "Unable to connect. Please try again or contact your administrator." };
  }

  const { data, error } = authResult;

  if (error) {
    console.error("[login] Supabase sign-in failed", {
      code: error.code,
      message: error.message,
      name: error.name,
      status: error.status,
    });
    cookieStore.delete(rememberCookie);
    return { error: authErrorMessage(error.code, error.message, error.status) };
  }

  let destination: UserHomePath | null = null;

  try {
    destination = await getUserHomePath(supabase, data.user.id);
  } catch (profileError) {
    console.error("[login] Unable to load user profile", profileError);
    await supabase.auth.signOut();
    cookieStore.delete(rememberCookie);
    return {
      error:
        "Unable to load your account role. Please try again or contact your administrator.",
    };
  }

  if (!destination) {
    console.error("[login] User profile has no supported role", {
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    cookieStore.delete(rememberCookie);
    return {
      error: "Your account role is not configured. Please contact your administrator.",
    };
  }

  redirect(destination, RedirectType.replace);
}

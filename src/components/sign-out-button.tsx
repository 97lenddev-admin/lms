"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, setRememberMe } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      setRememberMe(false);
      router.replace("/log-in");
      router.refresh();
    } catch {
      setError("Sign out failed. Please try again.");
      setPending(false);
    }
  }

  return <div>
    <button type="button" onClick={signOut} disabled={pending} aria-label="Sign out" title="Sign out" className="rounded p-1 hover:bg-[#fafafa] disabled:opacity-50">
      <Image src="/credit-analyst/icons/logout.svg" alt="" width={20} height={20} />
    </button>
    {error && <p role="alert" className="text-xs text-[#be123c]">{error}</p>}
  </div>;
}

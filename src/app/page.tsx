import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <Link
        href="/log-in"
        className="flex h-11 w-full max-w-[360px] items-center justify-center rounded-lg border-2 border-white/10 bg-[#e11d48] px-4 text-base font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_-2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
      >
        Login
      </Link>
    </main>
  );
}

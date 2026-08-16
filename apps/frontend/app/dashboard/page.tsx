"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.push("/sign-in");
  }, [isPending, session, router]);

  if (isPending) return <main className="auth-shell grid min-h-screen place-items-center px-6"><p className="text-sm text-muted-foreground">Loading your workspace…</p></main>;
  if (!session?.user) return <main className="auth-shell grid min-h-screen place-items-center px-6"><p className="text-sm text-muted-foreground">Taking you to sign in…</p></main>;

  const { user } = session;

  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-5 py-10 text-foreground sm:px-6">
      <section className="auth-card w-full max-w-md p-6 sm:p-8">
      <Link href="/" className="link-subtle inline-block text-xs font-medium uppercase tracking-[0.14em]">Thred</Link>
      <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em]">You’re signed in.</h1>
      <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      <button onClick={async () => { await signOut(); router.push("/"); }} className="btn-cta-primary mt-6 w-full">
        Sign out
      </button>
      </section>
    </main>
  );
}

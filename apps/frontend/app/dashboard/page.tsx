"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.push("/sign-in");
  }, [isPending, session, router]);

  if (isPending) return <p className="mt-8 text-center text-muted-foreground">Loading your workspace…</p>;
  if (!session?.user) return <p className="mt-8 text-center text-muted-foreground">Taking you to sign in…</p>;

  const { user } = session;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-4 px-6 py-10 text-foreground">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Thred</p>
      <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em]">You’re signed in.</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <button onClick={async () => { await signOut(); router.push("/"); }} className="btn-cta-primary w-full">
        Sign out
      </button>
    </main>
  );
}

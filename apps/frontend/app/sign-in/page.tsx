"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    const res = await signIn.email({ email: formData.get("email") as string, password: formData.get("password") as string });
    setIsSubmitting(false);
    if (res.error) setError("Unable to sign in. Check your email and password, then try again.");
    else router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-5 px-6 py-10 text-foreground">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Thred</p>
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em]">Sign in</h1>
        <p className="text-sm text-muted-foreground">Continue to your workspace.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5"><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-foreground/40 focus:bg-white" /></div>
        <div className="space-y-1.5"><label htmlFor="password" className="text-sm font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-foreground/40 focus:bg-white" /></div>
        <button type="submit" disabled={isSubmitting} className="btn-cta-primary w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

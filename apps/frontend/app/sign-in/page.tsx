"use client";

import { useState } from "react";
import Link from "next/link";
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
    <main className="auth-shell flex min-h-screen items-center justify-center px-5 py-10 text-foreground sm:px-6">
      <section className="auth-card w-full max-w-md p-6 sm:p-8">
        <div className="space-y-2">
          <Link href="/" className="link-subtle inline-block text-xs font-medium uppercase tracking-[0.14em]">Thred</Link>
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em]">Sign in</h1>
          <p className="text-sm text-muted-foreground">Continue to your workspace.</p>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required className="field-input" /></div>
          <div className="space-y-1.5"><label htmlFor="password" className="text-sm font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" /></div>
          <button type="submit" disabled={isSubmitting} className="btn-cta-primary mt-2 w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">New to Thred? <Link href="/sign-up" className="link-subtle font-medium">Create an account</Link></p>
      </section>
    </main>
  );
}

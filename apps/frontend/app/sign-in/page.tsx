"use client";

import { useState } from "react";
import { AuthPage } from "@/components/ui/auth-page";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (result?.error) { setIsSubmitting(false); setError("Unable to start Google sign-in. Check the OAuth configuration and try again."); }
  }

  return <AuthPage mode="sign-in" error={error} isSubmitting={isSubmitting} onSubmit={handleSubmit} />;
}

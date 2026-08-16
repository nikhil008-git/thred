"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/ui/auth-page";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    const result = await signIn.email({ email: formData.get("email") as string, password: formData.get("password") as string });
    setIsSubmitting(false);
    if (result.error) setError("Unable to sign in. Check your email and password, then try again.");
    else router.push("/dashboard");
  }

  return <AuthPage mode="sign-in" error={error} isSubmitting={isSubmitting} onSubmit={handleSubmit} />;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/ui/auth-page";
import { signIn, useSession } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const warmApi = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    void fetch(`${apiUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      mode: "cors",
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!isPending && session?.user) router.replace("/dashboard");
  }, [isPending, router, session?.user]);

  useEffect(() => {
    warmApi();
  }, []); // Warm the API while the visitor is deciding whether to continue.

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    warmApi();
    const result = await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (result?.error) { setIsSubmitting(false); setError("Unable to start Google sign-in. Check the OAuth configuration and try again."); }
  }

  if (session?.user) return null;
  return <AuthPage mode="sign-in" error={error} isSubmitting={isSubmitting} onSubmit={handleSubmit} />;
}

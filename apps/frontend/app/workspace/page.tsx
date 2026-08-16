"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/ui/auth-page";
import { useSession } from "@/lib/auth-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** The post-login onboarding step deliberately reuses the split auth composition. */
export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in");
  }, [isPending, router, session?.user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/api/workspaces`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("workspaceName") }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setError(body?.error ? `Workspace creation failed: ${body.error}` : `Workspace creation failed (HTTP ${response.status}).`);
      return;
    }
    router.push("/dashboard");
  }

  if (isPending || !session?.user) return null;
  return <AuthPage mode="workspace" error={error} isSubmitting={isSubmitting} onSubmit={handleSubmit} />;
}

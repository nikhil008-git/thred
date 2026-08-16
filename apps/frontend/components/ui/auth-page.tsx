"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { SiClaude, SiGoogle } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";
import { Button } from "./button";
import { Input } from "./input";

type AuthMode = "sign-in" | "workspace";

type AuthPageProps = {
  mode: AuthMode;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const content = {
  "sign-in": {
    eyebrow: "Shared agent memory",
    title: "Continue the work in motion.",
    description: "",
    submit: "Continue with Google",
    submitting: "Opening Google…",
    prompt: "",
    action: "",
    href: "/",
  },
  workspace: {
    eyebrow: "One last step",
    title: "Name the work you want to carry forward.",
    description: "Your workspace is where agents share checkpoints, decisions, and durable project memory.",
    submit: "Create workspace",
    submitting: "Creating workspace…",
    prompt: "Want to finish this later?",
    action: "Sign out",
    href: "/",
  },
} as const;

export function AuthPage({ mode, error, isSubmitting, onSubmit }: AuthPageProps) {
  const copy = content[mode];

  return (
    <main className="relative min-h-screen bg-[#fcfcfb] md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <aside className="thread-product-mesh isolate relative hidden h-full overflow-hidden border-r border-[#dce7dd] p-10 lg:flex lg:flex-col xl:p-14">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.88),transparent_30%),radial-gradient(circle_at_80%_78%,rgba(217,232,218,0.34),transparent_34%)]" />
        <Link href="/" className="landing-link relative z-10 flex w-fit items-center gap-2 text-[16px] font-semibold tracking-[-0.055em] text-[#1d2b20]">
          <ThreadMark className="size-7 shrink-0" />
          thred
        </Link>
        <div className="relative z-20 m-auto w-full max-w-[470px] text-center">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#466451]">Context stays with the work</p>
          <div className="flex items-center justify-center gap-3 rounded-[22px] border border-white/80 bg-[#eef2ee] p-4 shadow-[0_16px_42px_rgba(43,66,51,0.12)]">
            <AgentNode><SiClaude className="size-7" /></AgentNode>
            <ArrowRight className="size-4 shrink-0 text-[#93a099]" strokeWidth={1.5} />
            <div className="grid size-[64px] shrink-0 place-items-center"><ThreadMark className="size-[64px]" /></div>
            <ArrowRight className="size-4 shrink-0 text-[#93a099]" strokeWidth={1.5} />
            <AgentNode><HydraMark className="size-8" /></AgentNode>
            <ArrowRight className="size-4 shrink-0 text-[#93a099]" strokeWidth={1.5} />
            <AgentNode><RiOpenaiFill className="size-7" /></AgentNode>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#526b58]">One current context stream for every agent that picks up the task.</p>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-col justify-center bg-[#fcfcfb] px-5 py-10 sm:px-10 lg:px-[clamp(3rem,9vw,9rem)]">
        <Button variant="ghost" className="absolute left-4 top-5 text-[#4e504c] hover:bg-transparent hover:text-[#171717] sm:left-7 sm:top-7" asChild>
          <Link href="/"><ChevronLeft className="size-4" />Home</Link>
        </Button>
        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex w-fit items-center gap-2 text-[15px] font-semibold tracking-[-0.05em] text-[#253228]">
              <span className="grid size-7 place-items-center rounded-[8px] bg-[#243026] text-[10px] font-semibold text-white">t</span>
              thred
            </Link>
          </div>
          {mode !== "sign-in" && <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#858680]">{copy.eyebrow}</p>}
          {mode === "sign-in" && <ThreadMark className="mb-5 size-9" />}
          <h1 className={`${mode === "sign-in" ? "text-[28px] sm:text-[33px]" : "mt-3 text-[32px] sm:text-[38px]"} font-normal leading-[1.03] tracking-[-0.055em] text-[#171717]`}>{copy.title}</h1>
          <p className="mt-4 text-sm leading-6 text-[#70726e]">{copy.description}</p>

          {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {mode === "workspace" && (
              <label className="block space-y-1.5" htmlFor="workspace-name">
                <span className="text-sm font-medium text-[#373936]">Workspace name</span>
                <Input id="workspace-name" name="workspaceName" autoComplete="organization" required autoFocus placeholder="e.g. Acme engineering" className="border-[#e3e4e0] bg-white focus:border-[#737670] focus:shadow-[0_0_0_3px_rgba(23,23,23,0.08)]" />
                <span className="block text-xs text-[#858781]">You can invite teammates and create more workspaces later.</span>
              </label>
            )}
            {mode === "sign-in" && <div><Button type="submit" className="mt-2 w-full cursor-pointer bg-[#171717] hover:bg-[#363634]" disabled={isSubmitting}><SiGoogle className="size-4" />{isSubmitting ? copy.submitting : copy.submit}</Button></div>}
            {mode === "workspace" && <Button type="submit" className="mt-2 w-full bg-[#171717] hover:bg-[#363634]" disabled={isSubmitting}>{isSubmitting ? copy.submitting : copy.submit}</Button>}
          </form>
          {copy.prompt && <p className="mt-7 text-center text-sm text-[#7b7d78]">{copy.prompt}{copy.action && <> <Link href={copy.href} className="font-medium text-[#373936] underline decoration-[#b7b9b4] underline-offset-4 hover:text-[#171717]">{copy.action}</Link></>}</p>}
        </div>
      </section>
    </main>
  );
}

function ThreadMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id="auth-thread-mark-surface" x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#262927" />
          <stop offset="1" stopColor="#131514" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8.5" fill="url(#auth-thread-mark-surface)" />
      <path d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45" stroke="#F5F7F3" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" />
      <circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" />
      <circle cx="7.25" cy="9.1" r="0.52" fill="#202320" />
      <circle cx="20.75" cy="20.57" r="0.52" fill="#202320" />
    </svg>
  );
}

function AgentNode({ children }: { children: React.ReactNode }) {
  return <div className="grid size-[64px] shrink-0 place-items-center rounded-[18px] border border-[#d8ded8] bg-white text-[#59625b] shadow-[0_5px_13px_rgba(26,40,31,0.08)]">{children}</div>;
}

function HydraMark({ className = "" }: { className?: string }) {
  return (
    <span aria-label="HydraDB" className={`relative block overflow-hidden ${className}`}>
      <Image src="/hydradb-logo-white.png" alt="" width={1180} height={215} className="absolute left-1/2 top-[9.8%] h-full max-w-none w-auto -translate-x-[7.5%]" />
    </span>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiClaude, SiCline, SiCursor, SiModelcontextprotocol, SiWindsurf } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";
import { useSession } from "@/lib/auth-client";
import DashboardPage from "./dashboard/page";

function ThreadMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id="thread-mark-surface" x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#262927" />
          <stop offset="1" stopColor="#131514" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8.5" fill="url(#thread-mark-surface)" />
      <path d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45" stroke="#F5F7F3" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" />
      <circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" />
      <circle cx="7.25" cy="9.1" r="0.52" fill="#202320" />
      <circle cx="20.75" cy="20.57" r="0.52" fill="#202320" />
    </svg>
  );
}

function HydraMark({ className = "" }: { className?: string }) {
  return (
    <span aria-label="HydraDB" className={`relative block overflow-hidden ${className}`}>
      <Image src="/hydradb-logo-white.png" alt="" width={1180} height={215} className="absolute left-1/2 top-[9.8%] h-full max-w-none w-auto -translate-x-[7.5%]" />
    </span>
  );
}

function ToolFlow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] border border-white bg-[#f1f3ef]/95 p-2 shadow-[0_10px_26px_rgba(29,38,32,0.12)]">
      <div className="grid size-9 place-items-center rounded-[11px] border border-[#dfe2dc] bg-white text-[#646a64] transition-transform duration-200 ease-out hover:scale-110">{left}</div>
      <ArrowRight className="size-3 text-[#9ca19b]" strokeWidth={1.5} />
      <div className="grid size-9 place-items-center transition-transform duration-200 ease-out hover:scale-110"><ThreadMark className="size-9" /></div>
      <ArrowRight className="size-3 text-[#9ca19b]" strokeWidth={1.5} />
      <div className="grid size-9 place-items-center rounded-[11px] border border-[#dfe2dc] bg-white text-[#646a64] transition-transform duration-200 ease-out hover:scale-110">{right}</div>
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fcfcfb] text-[#171717]">
      <nav className="mx-auto flex h-[86px] max-w-[1760px] items-center justify-between px-6 sm:px-10">
        <Link href="/" className="landing-link flex items-center gap-2 text-[16px] font-semibold tracking-[-0.055em]">
          <ThreadMark className="size-7 shrink-0" />
          thred
        </Link>
        <div className="flex items-center gap-5">
          {session?.user ? <Link href="/dashboard" className="nav-link text-[13px] font-medium text-[#171717] hover:text-[#171717]">dashboard <ArrowRight className="inline size-3.5" strokeWidth={1.6} /></Link> : <Link href="/sign-in" className="nav-link text-[13px] font-medium text-[#171717] hover:text-[#171717]">sign in <ArrowRight className="inline size-3.5" strokeWidth={1.6} /></Link>}
        </div>
      </nav>

      <section className="relative min-h-[calc(100svh-86px)] max-w-none overflow-hidden bg-[#fcfcfb] px-6 py-14 sm:px-10 sm:py-18 lg:grid lg:min-h-0 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:py-10 lg:pr-0">
        <div className="relative z-10 mx-auto max-w-[440px] text-center lg:mx-0 lg:self-center lg:text-left">
          <h1 className="max-w-none text-[30px] font-normal leading-[0.98] tracking-[-0.055em] sm:text-[34px] lg:text-[35px] lg:leading-[0.96]">
            <span className="block text-[#111111]">Context that carries your</span>
            <span className="block text-[#6b6e69]">work forward.</span>
          </h1>
          <p className="mt-5 max-w-[440px] text-pretty text-[12px] leading-[1.65] text-[#70726e] sm:text-[13px]">
            Thread gives Claude, Codex, and Cursor shared memory for decisions, revisions, and unfinished work—so the next agent starts where the last one stopped.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 lg:justify-start">
            <Link href={session?.user ? "/dashboard" : "/sign-in"} className="landing-cta inline-flex items-center gap-1.5 rounded-[5px] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_1px_1px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)] hover:bg-[#363634] hover:shadow-[0_1px_1px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.14)]">{session?.user ? "Open dashboard" : "Sign in"} <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
            <a href="#mcp" className="landing-link inline-flex items-center gap-1.5 text-[12px] text-[#5f625d] hover:text-[#171717]">Explore MCP <ArrowRight className="size-3" strokeWidth={1.6} /></a>
          </div>
        </div>
        <div id="how-it-works" className="relative mx-auto mt-12 h-[390px] w-full overflow-hidden sm:h-[560px] lg:mt-0 lg:h-[760px]">
          <div className="pointer-events-none absolute left-0 top-0 w-[1440px] origin-top-left scale-[0.42] sm:scale-[0.6] lg:scale-[0.84]">
            <DashboardPage preview />
          </div>
          <Link
            href={session?.user ? "/dashboard" : "/sign-in"}
            aria-label="Open the Thred dashboard"
            className="absolute inset-0 z-10"
          />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-[#fcfcfb]/95 via-[#fcfcfb]/55 to-transparent backdrop-blur-[1px] sm:h-24" />
      </section>

      <div className="mx-auto max-w-[1000px] border-x border-[#e8e8e4]">
      <section id="mcp" className="px-6 sm:px-8">
        <div className="border-b border-[#e8e8e4] py-9 sm:py-11">
          <p className="text-center text-[11px] text-[#858680] sm:text-[12px]">One shared memory, available through MCP wherever your agents work.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-9 gap-y-5 text-[#6c6e69] sm:gap-x-12">
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><SiClaude className="size-5" />Claude</div>
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><RiOpenaiFill className="size-5" />Codex</div>
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><SiCursor className="size-[18px]" />Cursor</div>
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><SiWindsurf className="size-5" />Windsurf</div>
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><SiCline className="size-5" />Cline</div>
            <div className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.045em]"><SiModelcontextprotocol className="size-5" />MCP</div>
          </div>
        </div>
        </section>

        <section id="memory" className="border-b border-[#e8e8e4] px-6 py-12 text-center sm:px-8 sm:py-14">
          <div className="mx-auto max-w-[620px]">
            <h2 className="text-balance text-[22px] font-medium leading-[1.12] tracking-[-0.045em] text-[#252724] sm:text-[28px]">One memory for every agent that touches the work.</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-6 text-[#70766f] sm:text-[14px]">Claude saves the decision and the next step. Thread resolves what changed. Codex continues with the context it needs.</p>

            <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-[22px] border border-white/80 bg-[#e9ece9]/90 p-3 shadow-[0_14px_40px_rgba(65,84,72,0.12)]">
              <div className="grid size-[60px] place-items-center rounded-[16px] border border-[#d9ddd8] bg-white text-[#575d58] shadow-[0_5px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out hover:scale-110"><SiClaude className="size-7" /></div>
              <ArrowRight className="size-4 text-[#9ba29c]" strokeWidth={1.5} />
              <div className="grid size-[60px] place-items-center transition-transform duration-200 ease-out hover:scale-110"><ThreadMark className="size-[60px]" /></div>
              <ArrowRight className="size-4 text-[#9ba29c]" strokeWidth={1.5} />
              <div className="grid size-[60px] place-items-center rounded-[16px] border border-[#d9ddd8] bg-white shadow-[0_5px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out hover:scale-110"><HydraMark className="size-8" /></div>
              <ArrowRight className="size-4 text-[#9ba29c]" strokeWidth={1.5} />
              <div className="grid size-[60px] place-items-center rounded-[16px] border border-[#d9ddd8] bg-white text-[#575d58] shadow-[0_5px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out hover:scale-110"><RiOpenaiFill className="size-7" /></div>
            </div>

            <Link href="/sign-up" className="landing-cta mt-8 inline-flex items-center gap-2 rounded-[5px] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_1px_1px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)] hover:bg-[#363634] hover:shadow-[0_1px_1px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.14)]">Connect an agent <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
          </div>
        </section>

      </div>

      <section className="mx-auto max-w-[1000px] border-x border-[#e8e8e4] px-6 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-20">
          <div className="mx-auto max-w-[620px] border-b border-[#e8e8e4] pb-10 text-center sm:pb-12">
            <h2 className="text-balance text-[22px] font-medium leading-[1.12] tracking-[-0.045em] text-[#252724] sm:text-[28px]">
              Keep the work connected across every handoff.
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-6 text-[#70766f] sm:text-[14px]">
              Thread keeps the active task, changing decisions, and supporting evidence available to the next tool that needs it.
            </p>
          </div>

          <div className="space-y-0">
            {[
              {
                title: "Start every agent with context",
                body: "Copy the instructions for the agent you use, then let Thred carry the decisions and next step forward.",
                dashboardView: "prompts",
                left: <SiCursor className="size-[18px]" />,
                right: <RiOpenaiFill className="size-[18px]" />,
              },
              {
                title: "Resume a handoff",
                body: "Every saved checkpoint is ready for the next agent to pick up without losing the work in motion.",
                dashboardView: "handoffs",
                left: <SiClaude className="size-[18px]" />,
                right: <SiModelcontextprotocol className="size-[18px]" />,
              },
              {
                title: "Connect Thred through MCP",
                body: "Use your real MCP configuration to bring shared workspace memory into the tools your agents already use.",
                dashboardView: "mcp",
                left: <SiWindsurf className="size-[18px]" />,
                right: <SiCline className="size-[18px]" />,
              },
            ].map((card) => (
              <article key={card.title} className="overflow-hidden border-b border-[#e8e8e4] bg-[#fcfcfb] py-7 last:border-b-0 sm:py-9">
                <div className="px-5 pb-7 pt-7 text-center sm:px-10 sm:pb-8 sm:pt-9">
                  <h3 className="text-[20px] font-medium tracking-[-0.045em] text-[#252724] sm:text-[24px]">{card.title}</h3>
                  <p className="mx-auto mt-2 max-w-[500px] text-[12px] leading-5 text-[#747770] sm:text-[13px]">{card.body}</p>
                </div>
                <div className="thread-product-mesh relative overflow-hidden px-5 pt-12 sm:px-8 sm:pt-16">
                  <div className="pointer-events-auto absolute left-1/2 top-5 z-10 -translate-x-1/2 sm:top-7">
                    <ToolFlow left={card.left} right={card.right} />
                  </div>
                  <div className="mx-auto h-[220px] max-w-[900px] overflow-hidden rounded-t-[11px] border-x border-t border-[#e2e4df] bg-white shadow-[0_-6px_24px_rgba(35,48,40,0.1)] sm:h-[350px]">
                    <iframe
                      src={`/dashboard?preview=hero&view=${card.dashboardView}`}
                      title={`${card.title} in Thred`}
                      tabIndex={-1}
                      className="pointer-events-none h-[950px] w-[1280px] origin-top-left scale-[0.49] border-0 sm:scale-[0.7]"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
      </section>

      <footer className="mx-auto max-w-[1000px] border-x border-t border-[#e8e8e4] px-6 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-9 sm:grid-cols-[1.3fr_1fr] sm:gap-6">
          <div>
            <Link href="/" className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.04em]">
              <ThreadMark className="size-5" />
              thred
            </Link>
            <p className="mt-3 max-w-[150px] text-[11px] leading-5 text-[#7b7d78]">Memory that carries work across agents.</p>
          </div>
          <div>
            <p className="text-[11px] text-[#90928d]">Explore</p>
            <div className="mt-3 space-y-2">
              <a href="#memory" className="block text-[11px] text-[#373936] transition-colors hover:text-[#6b866f]">Memory</a>
              <a href="#how-it-works" className="block text-[11px] text-[#373936] transition-colors hover:text-[#6b866f]">How it works</a>
              <Link href="/dashboard" className="block text-[11px] text-[#373936] transition-colors hover:text-[#6b866f]">MCP</Link>
            </div>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-[#e8e8e4] pt-5 text-[11px] text-[#858781]">
          <p>© 2026 thred</p>
        </div>
      </footer>
    </main>
  );
}

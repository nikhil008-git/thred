"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiClaude, SiCline, SiCursor, SiModelcontextprotocol, SiWindsurf } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";
import { useSession } from "@/lib/auth-client";

function ThreadMark({ className = "", bevel = false }: { className?: string; bevel?: boolean }) {
  // Unique per instance: a gradient inside a hidden copy can't paint visible ones.
  const gradientId = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#262927" />
          <stop offset="1" stopColor="#131514" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8.5" fill={`url(#${gradientId})`} />
      {bevel && <rect x="1.6" y="1.6" width="24.8" height="24.8" rx="7" stroke="#fff" strokeOpacity=".17" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
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
    <div className="flex items-center gap-2 bevel-tray rounded-[16px] p-2">
      <div className="grid size-9 place-items-center bevel-tile rounded-[11px] text-[#646a64] transition-transform duration-200 ease-out hover:scale-110">{left}</div>
      <ArrowRight className="size-3 text-[#9ca19b]" strokeWidth={1.5} />
      <div className="grid size-9 place-items-center transition-transform duration-200 ease-out hover:scale-110"><ThreadMark bevel className="size-9" /></div>
      <ArrowRight className="size-3 text-[#9ca19b]" strokeWidth={1.5} />
      <div className="grid size-9 place-items-center bevel-tile rounded-[11px] text-[#646a64] transition-transform duration-200 ease-out hover:scale-110">{right}</div>
    </div>
  );
}

const DASHBOARD_WIDTH = 1280;

/**
 * The real dashboard at desktop width inside an iframe, scaled to fit. The
 * iframe has its own 1280px viewport, so phones still see the desktop layout
 * instead of a cropped mobile one.
 */
function DashboardFrame({ view, title, visibleHeight }: { view: string; title: string; visibleHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / DASHBOARD_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: `${DASHBOARD_WIDTH} / ${visibleHeight}` }}>
      <iframe
        src={`/dashboard?preview=hero&view=${view}`}
        title={title}
        tabIndex={-1}
        loading="lazy"
        className={`pointer-events-none absolute left-0 top-0 origin-top-left border-0 ${scale ? "" : "invisible"}`}
        style={{ width: DASHBOARD_WIDTH, height: 1100, transform: `scale(${scale})` }}
      />
    </div>
  );
}

const testimonials = [
  { name: "Harnoor Singh", handle: "iHarnoorSingh", verified: true, date: "Aug 18, 2026", id: "2089829610427216278", text: "this is lit!! better memory and reduces the need of openrouter" },
  { name: "waishnav", handle: "wshxnv", verified: true, date: "Aug 18, 2026", id: "2089760130250440770", text: "good work :)\n\nat some point i was gonna build smth similar the context layer for codebases but aparently models got better at exploring codebases on demand, so dropped that idea\n\nyou should do eval/benchmark btw" },
  { name: "Arinjay Wyawhare", handle: "jaywyawhare", verified: true, date: "Aug 19, 2026", id: "2090036443603456021", text: "Lfg, good idea and great execution." },
  { name: "Saurabh", handle: "_saurabh__xd", verified: false, date: "Aug 18, 2026", id: "2089719243562733899", text: "Hire him @hydra_db" },
  { name: "aniketh", handle: "Aniketh_Deb", verified: true, date: "Aug 18, 2026", id: "2089718911063453773", text: "nice , @contextkingceo  have a look at it" },
  { name: "Vyom", handle: "HelloVyom", verified: true, date: "Aug 18, 2026", id: "2089733478002884981", text: "Great work bro!!!" },
  { name: "Atharva", handle: "AtharvaXDevs", verified: true, date: "Aug 18, 2026", id: "2089732744599535817", text: "crazy work man" },
  { name: "Nandkishor", handle: "devops_nk", verified: true, date: "Aug 18, 2026", id: "2089760526230540292", text: "Cool brother let me try this out this weekend" },
];

function XLogo({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg aria-label="Verified" viewBox="0 0 22 22" className="size-3.5 shrink-0">
      <path fill="#1d9bf0" d="M20.4 11c0-1.35-.8-2.5-1.97-3.04.45-1.2.2-2.6-.74-3.56-.95-.95-2.36-1.2-3.56-.75A3.36 3.36 0 0 0 11 1.6c-1.35 0-2.5.8-3.04 1.97a3.37 3.37 0 0 0-3.56.75c-.95.95-1.2 2.36-.75 3.56A3.36 3.36 0 0 0 1.6 11c0 1.35.8 2.5 1.97 3.04-.45 1.2-.2 2.6.75 3.56.95.95 2.36 1.2 3.56.74A3.36 3.36 0 0 0 11 20.4c1.35 0 2.5-.8 3.04-1.97 1.2.45 2.6.2 3.56-.74.95-.96 1.2-2.37.74-3.56A3.36 3.36 0 0 0 20.4 11Z" />
      <path fill="#fff" d="m9.6 14.6-3.1-3.1 1.17-1.18 1.93 1.93 4.73-4.73 1.18 1.18-5.9 5.9Z" />
    </svg>
  );
}

/** Mentions render muted so a reply reads like the original post. */
function TweetText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\w+)/).map((part, index) =>
        part.startsWith("@") ? <span key={index} className="text-[#1d9bf0]">{part}</span> : part,
      )}
    </>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="page-frame mx-auto max-w-[1000px] border-x border-t px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[560px] text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8d87]">Said on X</p>
        <h2 className="mt-3 text-balance text-[22px] font-medium leading-[1.12] tracking-[-0.045em] text-[#252724] sm:text-[28px]">
          Builders are already handing work off.
        </h2>
        <p className="mx-auto mt-4 max-w-[440px] text-[13px] leading-6 text-[#70766f] sm:text-[14px]">
          What people said when Thred shipped. Unedited, straight from the replies.
        </p>
      </div>

      <div className="mt-10 columns-1 gap-3 sm:mt-12 sm:columns-2 lg:columns-3">
        {testimonials.map((item) => (
          <a
            key={item.id}
            href={`https://x.com/${item.handle}/status/${item.id}`}
            target="_blank"
            rel="noreferrer"
            className="testimonial-card bevel-tile mb-3 block break-inside-avoid rounded-[14px] p-4"
          >
            <div className="flex items-center gap-2.5">
              <Image
                src={`/testimonials/${item.handle}.jpg`}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full outline outline-1 -outline-offset-1 outline-black/10"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[13px] font-medium leading-tight text-[#1d1f1c]">
                  <span className="truncate">{item.name}</span>
                  {item.verified && <VerifiedBadge />}
                </p>
                <p className="truncate text-[12px] leading-tight text-[#8a8d87]">@{item.handle}</p>
              </div>
              <XLogo className="size-3.5 shrink-0 text-[#1d1f1c] opacity-70" />
            </div>
            <p className="mt-3 whitespace-pre-line text-pretty text-[13.5px] leading-[1.55] text-[#2e302c]">
              <TweetText text={item.text} />
            </p>
            <p className="mt-3 text-[11px] text-[#9a9c96]">{item.date}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fcfcfb] text-[#171717]">
      <nav className="mx-auto flex h-[86px] w-full max-w-[1080px] items-center justify-between px-6 sm:px-8">
        <Link href="/" className="landing-link flex items-center gap-2 text-[16px] font-semibold tracking-[-0.055em]">
          <ThreadMark className="size-7 shrink-0" />
          thred
        </Link>
        <div className="flex items-center gap-5">
          {session?.user ? <Link href="/dashboard" className="nav-link text-[13px] font-medium text-[#171717] hover:text-[#171717]">dashboard <ArrowRight className="inline size-3.5" strokeWidth={1.6} /></Link> : <Link href="/sign-in" className="nav-link text-[13px] font-medium text-[#171717] hover:text-[#171717]">sign in <ArrowRight className="inline size-3.5" strokeWidth={1.6} /></Link>}
        </div>
      </nav>

      <section className="relative overflow-x-clip bg-[#fcfcfb] px-6 pt-12 sm:px-10 sm:pt-16">
        <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col items-start text-left">
          <h1 className="max-w-none text-[30px] font-normal leading-[0.98] tracking-[-0.055em] sm:text-[38px] lg:text-[44px] lg:leading-[0.96]">
            <span className="block text-[#111111]">Context that carries your</span>
            <span className="block text-[#6b6e69]">work forward.</span>
          </h1>
          <p className="mt-5 max-w-[480px] text-pretty text-[12px] leading-[1.65] text-[#70726e] sm:text-[14px]">
            Thread gives Claude, Codex, and Cursor shared memory for decisions, revisions, and unfinished work, so the next agent starts where the last one stopped.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href={session?.user ? "/dashboard" : "/sign-in"} className="landing-cta inline-flex items-center gap-1.5 rounded-[5px] btn-ink px-4 py-2.5 text-[12px] font-medium">{session?.user ? "Open dashboard" : "Sign in"} <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
            <a href="#mcp" className="landing-link inline-flex items-center gap-1.5 text-[12px] text-[#5f625d] hover:text-[#171717]">Explore MCP <ArrowRight className="size-3" strokeWidth={1.6} /></a>
          </div>
        </div>
        <div id="how-it-works" className="relative mx-auto mt-12 w-full max-w-[1120px] sm:mt-16">
          <div className="relative overflow-hidden rounded-t-[12px] border-x border-t border-[#d7dad4] bg-[#f1f2f0] shadow-[0_-12px_40px_rgba(16,22,18,0.12),0_-2px_8px_rgba(16,22,18,0.06)] sm:rounded-t-[18px]">
            <DashboardFrame view="overview" title="Thred dashboard" visibleHeight={820} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b sm:h-32 from-transparent to-[#fcfcfb]" />
            <Link
              href={session?.user ? "/dashboard" : "/sign-in"}
              aria-label="Open the Thred dashboard"
              className="absolute inset-0 z-10"
            />
          </div>
        </div>
      </section>

      <div className="page-frame mx-auto max-w-[1000px] border-x">
      <section id="mcp" className="px-6 sm:px-8">
        <div className="rule-fade border-b py-9 sm:py-11">
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

        <section id="memory" className="rule-fade frame-marks border-b px-6 py-12 text-center sm:px-8 sm:py-14">
          <div className="mx-auto max-w-[620px]">
            <h2 className="text-balance text-[22px] font-medium leading-[1.12] tracking-[-0.045em] text-[#252724] sm:text-[28px]">One memory for every agent that touches the work.</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-6 text-[#70766f] sm:text-[14px]">Claude saves the decision and the next step. Thread resolves what changed. Codex continues with the context it needs.</p>

            <div className="mx-auto mt-8 flex w-fit items-center gap-1.5 bevel-tray rounded-[22px] p-2 sm:gap-3 sm:p-3">
              <div className="grid size-12 place-items-center sm:size-[60px] bevel-tile rounded-[16px] text-[#575d58] transition-transform duration-200 ease-out hover:scale-110"><SiClaude className="size-6 sm:size-7" /></div>
              <ArrowRight className="size-3 shrink-0 text-[#9ba29c] sm:size-4" strokeWidth={1.5} />
              <div className="grid size-12 place-items-center sm:size-[60px] transition-transform duration-200 ease-out hover:scale-110"><ThreadMark bevel className="size-12 sm:size-[60px]" /></div>
              <ArrowRight className="size-3 shrink-0 text-[#9ba29c] sm:size-4" strokeWidth={1.5} />
              <div className="grid size-12 place-items-center sm:size-[60px] bevel-tile rounded-[16px] transition-transform duration-200 ease-out hover:scale-110"><HydraMark className="size-7 sm:size-8" /></div>
              <ArrowRight className="size-3 shrink-0 text-[#9ba29c] sm:size-4" strokeWidth={1.5} />
              <div className="grid size-12 place-items-center sm:size-[60px] bevel-tile rounded-[16px] text-[#575d58] transition-transform duration-200 ease-out hover:scale-110"><RiOpenaiFill className="size-6 sm:size-7" /></div>
            </div>

            <Link href="/sign-up" className="landing-cta mt-8 inline-flex items-center gap-2 rounded-[5px] btn-ink px-4 py-2.5 text-[12px] font-medium">Connect an agent <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
          </div>
        </section>

      </div>

      <section className="page-frame mx-auto max-w-[1000px] border-x px-6 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-20">
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
                dashboardView: "overview",
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
                <div className="thread-product-mesh relative overflow-hidden px-4 pt-5 sm:px-8 sm:pt-7">
                  <div className="relative z-10 mx-auto mb-4 w-fit sm:mb-6">
                    <ToolFlow left={card.left} right={card.right} />
                  </div>
                  <div className="mx-auto max-w-[900px] overflow-hidden rounded-t-[11px] border-x border-t border-[#e2e4df] bg-white shadow-[0_-6px_24px_rgba(35,48,40,0.1)]">
                    <DashboardFrame view={card.dashboardView} title={`${card.title} in Thred`} visibleHeight={640} />
                  </div>
                </div>
              </article>
            ))}
          </div>
      </section>

      <Testimonials />

      <footer className="page-frame mx-auto max-w-[1000px] overflow-hidden border-x border-t">
        <div className="flex flex-col gap-8 px-6 pt-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div>
            <Link href="/" className="landing-link flex items-center gap-2 text-[14px] font-semibold tracking-[-0.04em]">
              <ThreadMark className="size-5" />
              thred
            </Link>
            <p className="mt-3 max-w-[240px] text-[13px] leading-6 text-[#70726e]">Memory that carries work across agents.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#memory" className="landing-link text-[12px] text-[#5f625d] hover:text-[#171717]">Memory</a>
            <a href="#how-it-works" className="landing-link text-[12px] text-[#5f625d] hover:text-[#171717]">How it works</a>
            <a href="#mcp" className="landing-link text-[12px] text-[#5f625d] hover:text-[#171717]">MCP</a>
            <a href="https://github.com/nikhil008-git/thred" target="_blank" rel="noreferrer" className="landing-link text-[12px] text-[#5f625d] hover:text-[#171717] inline-flex items-center gap-1">GitHub <ArrowUpRight className="size-3" strokeWidth={1.7} /></a>
            <Link href={session?.user ? "/dashboard" : "/sign-in"} className="landing-link text-[12px] text-[#5f625d] hover:text-[#171717]">{session?.user ? "Dashboard" : "Sign in"}</Link>
          </nav>
        </div>
        <div className="mt-14 flex items-center justify-between px-6 text-[11px] text-[#9a9c96] sm:px-8">
          <p>© 2026 thred</p>
          <a href="#" className="landing-link hover:text-[#171717]">Back to top ↑</a>
        </div>
        <p aria-hidden="true" className="pointer-events-none mt-4 translate-y-[18%] select-none text-center text-[clamp(110px,24vw,250px)] font-medium leading-[0.8] tracking-[-0.08em] text-[#efefeb]">
          thred
        </p>
      </footer>
    </main>
  );
}

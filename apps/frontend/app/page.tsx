import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiClaude, SiCline, SiCursor, SiModelcontextprotocol, SiWindsurf } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";

function ThreadMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className} fill="none">
      <rect x="1" y="1" width="26" height="26" rx="7.5" fill="#171717" />
      <path
        d="M7.5 9.25h7.1a3.15 3.15 0 0 1 0 6.3H13.4a3.15 3.15 0 0 0 0 6.3h7.1"
        stroke="white"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 18.75h2.2" stroke="white" strokeWidth="2.15" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fcfcfb] text-[#171717]">
      <nav className="mx-auto flex h-[86px] max-w-[1760px] items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.04em]">
          <ThreadMark className="size-6 shrink-0" />
          thred
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 text-[13px] text-[#6f716d] lg:flex">
          <a href="#memory" className="transition-colors hover:text-[#171717]">memory</a>
          <a href="#how-it-works" className="transition-colors hover:text-[#171717]">how it works</a>
          <a href="#mcp" className="transition-colors hover:text-[#171717]">MCP</a>
          <a href="#evals" className="transition-colors hover:text-[#171717]">evals</a>
          <a href="#docs" className="transition-colors hover:text-[#171717]">docs</a>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="hidden text-[13px] text-[#4e504c] transition-colors hover:text-[#171717] sm:block">sign in</Link>
          <Link href="/sign-up" className="text-[13px] font-medium text-[#171717] transition-colors hover:text-[#5c7565]">create workspace <ArrowRight className="inline size-3.5" strokeWidth={1.6} /></Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-[1760px] overflow-hidden px-6 pb-4 pt-14 sm:px-10 sm:pt-18 lg:pb-6 lg:pt-20">
        <div aria-hidden="true" className="absolute right-[-8%] top-20 h-[480px] w-[44%] bg-[radial-gradient(ellipse_at_70%_40%,rgba(205,224,242,0.58),transparent_23%),radial-gradient(ellipse_at_30%_68%,rgba(210,232,218,0.66),transparent_30%)]" />
        <div className="relative max-w-[980px]">
          <h1 className="max-w-[18ch] text-[42px] font-normal leading-[0.98] tracking-[-0.055em] sm:text-[50px] lg:text-[60px] lg:leading-[0.96]">
            <span className="block text-[#111111]">Context that carries your</span>
            <span className="block text-[#6b6e69]">work forward.</span>
          </h1>
          <p className="mt-5 max-w-[640px] text-pretty text-[13px] leading-[1.6] text-[#70726e] sm:text-[15px]">
            Thread gives Claude, Codex, and Cursor shared memory for decisions, revisions, and unfinished work—so the next agent starts where the last one stopped.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#363634]">Create a workspace <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
            <a href="#how-it-works" className="inline-flex items-center gap-1.5 text-[12px] text-[#5f625d] transition-colors hover:text-[#171717]">Explore the memory flow <ArrowRight className="size-3" strokeWidth={1.6} /></a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1400px] px-6 py-8 sm:px-10 sm:py-12">
        <div className="thread-mesh relative min-h-[370px] overflow-hidden rounded-[28px] sm:min-h-[540px]">
          <div className="absolute inset-x-[8%] top-[10%] overflow-hidden rounded-[18px] border border-white/85 bg-white shadow-[0_20px_60px_rgba(35,48,40,0.15)] sm:inset-x-[10%]">
            <Image
              src="/temporary-saas-preview-v2.png"
              alt="Temporary SaaS landing page preview"
              width={1587}
              height={993}
              sizes="(min-width: 640px) 1120px, 84vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1000px] border-x border-[#e8e8e4]">
      <section id="mcp" className="px-6 sm:px-8">
        <div className="border-y border-[#e8e8e4] py-9 sm:py-11">
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
              <div className="grid size-[60px] place-items-center rounded-[16px] border border-[#d9ddd8] bg-white text-[#575d58] shadow-[0_5px_12px_rgba(0,0,0,0.06)]"><SiClaude className="size-7" /></div>
              <ArrowRight className="size-4 text-[#9ba29c]" strokeWidth={1.5} />
              <div className="grid size-[60px] place-items-center rounded-[16px] bg-[#1b1d1a] text-white shadow-[0_5px_12px_rgba(0,0,0,0.15)]"><ThreadMark className="size-8" /></div>
              <ArrowRight className="size-4 text-[#9ba29c]" strokeWidth={1.5} />
              <div className="grid size-[60px] place-items-center rounded-[16px] border border-[#d9ddd8] bg-white text-[#575d58] shadow-[0_5px_12px_rgba(0,0,0,0.06)]"><RiOpenaiFill className="size-7" /></div>
            </div>

            <Link href="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-[5px] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#363634]">Connect an agent <ArrowUpRight className="size-3" strokeWidth={1.7} /></Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 px-6 pb-24 sm:grid-cols-3 sm:gap-10 sm:px-8">
        {[["Working continuity", "Know exactly where the last agent stopped."], ["Temporal truth", "See the decision now—and what it replaced."], ["Inspectable context", "Every retrieved memory carries its evidence."]].map(([title, body]) => <div key={title}><p className="text-[15px] font-medium tracking-[-0.035em]">{title}</p><p className="mt-2 max-w-[220px] text-[12px] leading-5 text-[#797974]">{body}</p></div>)}
      </section>
      </div>
    </main>
  );
}

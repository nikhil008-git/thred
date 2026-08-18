"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Coffee,
  Copy,
  GitFork,
  KeyRound,
  LayoutDashboard,
  Layers3,
  Link2,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SiClaude, SiCursor, SiModelcontextprotocol } from "react-icons/si";
import { signOut, useSession } from "@/lib/auth-client";

const MCP_PACKAGE = "@thred_nick_01/thred-mcp";
const MCP_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function mcpServerConfig() {
  return `{
  "mcpServers": {
    "thred": {
      "command": "npx",
      "args": ["-y", "${MCP_PACKAGE}"],
      "env": {
        "THRED_API_KEY": "thrd_sk_…",
        "THRED_API_URL": "${MCP_API_URL}"
      }
    }
  }
}`;
}

type Workspace = { id: string; name: string; slug: string };
type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};
type ProviderCredential = {
  id: string;
  provider: string;
  label: string;
  model: string;
  baseUrl: string | null;
  keyHint: string;
  updatedAt: string;
};
type View =
  | "overview"
  | "handoffs"
  | "mcp"
  | "apiKeys"
  | "providers"
  | "prompts"
  | "docs"
  | "settings";
type Overview = {
  metrics: { agentCount: number; checkpointCount: number };
  latestSessions: Array<{
    id: string;
    agent: string;
    startedAt: string;
    endedAt: string | null;
  }>;
  latestCheckpoints: Array<{
    id: string;
    task: string;
    status: string;
    updatedAt: string;
    payload: { nextStep?: string };
    session: { agent: string };
  }>;
};

const heroPreviewWorkspace: Workspace = {
  id: "hero-preview",
  name: "New workspace",
  slug: "new-workspace",
};

const heroPreviewOverview: Overview = {
  metrics: { agentCount: 0, checkpointCount: 0 },
  latestSessions: [],
  latestCheckpoints: [],
};

function Mark({ className = "size-8 shrink-0" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient
          id="dashboard-mark"
          x1="3"
          y1="2"
          x2="25"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#262927" />
          <stop offset="1" stopColor="#131514" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8.5" fill="url(#dashboard-mark)" />
      <path
        d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45"
        stroke="#F5F7F3"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" />
      <circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" />
      <circle cx="7.25" cy="9.1" r="0.52" fill="#202320" />
      <circle cx="20.75" cy="20.57" r="0.52" fill="#202320" />
    </svg>
  );
}

function HydraMark() {
  return (
    <span
      aria-label="HydraDB"
      className="relative block size-8 overflow-hidden"
    >
      <Image
        src="/hydradb-logo-white.png"
        alt=""
        width={1180}
        height={215}
        className="absolute left-[3px] top-0 h-8 max-w-none w-auto"
      />
    </span>
  );
}

function CodexMark() {
  return (
    <Image
      src="/codex-mark.png"
      alt="Codex"
      width={512}
      height={512}
      className="size-full object-cover"
    />
  );
}

function DashboardSkeleton() {
  const bar = "animate-pulse rounded bg-[#e8ebe6]";

  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="min-h-screen bg-white text-[#242622] lg:grid lg:grid-cols-[224px_minmax(0,1fr)]"
    >
      <aside className="hidden min-h-screen bg-[#f1f2f0] px-4 py-3 lg:block">
        <div className="flex items-center gap-2.5 px-2">
          <div className="size-8 animate-pulse rounded-[8px] bg-[#dfe2dd]" />
          <div className="h-5 w-12 animate-pulse rounded bg-[#dfe2dd]" />
        </div>
        <div className="mt-10 space-y-3 px-2">
          <div className="h-2 w-14 animate-pulse rounded bg-[#dfe2dd]" />
          <div className="h-9 animate-pulse rounded-[9px] bg-[#e5e7e3]" />
          <div className="h-9 animate-pulse rounded-[9px] bg-[#e5e7e3]" />
        </div>
        <div className="mt-9 space-y-3 px-2">
          <div className="h-2 w-12 animate-pulse rounded bg-[#dfe2dd]" />
          <div className="h-9 animate-pulse rounded-[9px] bg-[#e5e7e3]" />
          <div className="h-9 animate-pulse rounded-[9px] bg-[#e5e7e3]" />
        </div>
      </aside>
      <section className="min-w-0 bg-white">
        <header className="h-12 bg-[#f1f2f0]" />
        <div className="min-h-[calc(100vh-48px)] rounded-tl-[80px] bg-white">
          <div className="mx-auto max-w-[940px] px-7 py-14 sm:px-12 sm:py-16">
            <div className="mx-auto max-w-[535px] space-y-4 text-center">
              <div className={`${bar} mx-auto h-2 w-28`} />
              <div className={`${bar} mx-auto h-10 w-[88%]`} />
              <div className={`${bar} mx-auto h-4 w-full`} />
              <div className={`${bar} mx-auto h-4 w-[78%]`} />
            </div>
            <div className="mx-auto mt-12 flex max-w-[420px] items-center justify-between px-5">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="size-12 animate-pulse rounded-[14px] bg-[#e8ebe6]"
                />
              ))}
            </div>
            <div className="mx-auto mt-12 max-w-[620px] space-y-3 text-center">
              <div className={`${bar} mx-auto h-4 w-48`} />
              <div className={`${bar} mx-auto h-3 w-72`} />
              <div className="mx-auto mt-5 h-9 w-32 animate-pulse rounded-[6px] bg-[#e1e4df]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ApiKeys({
  workspace,
  request,
}: {
  workspace: Workspace;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const response = await request(
      `/api/workspaces/${workspace.slug}/api-keys`,
    );
    if (response.ok)
      setKeys(((await response.json()) as { apiKeys: ApiKey[] }).apiKeys);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [workspace.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    const response = await request(
      `/api/workspaces/${workspace.slug}/api-keys`,
      { method: "POST", body: JSON.stringify({ name: "Thred agent key" }) },
    );
    if (!response.ok) return;
    const result = (await response.json()) as {
      apiKey: ApiKey;
      secret: string;
    };
    setKeys((current) => [result.apiKey, ...current]);
    setRevealedKey(result.secret);
    setCopied(false);
  };
  const revoke = async (key: ApiKey) => {
    const response = await request(
      `/api/workspaces/${workspace.slug}/api-keys/${key.id}/revoke`,
      { method: "POST" },
    );
    if (response.ok)
      setKeys((current) => current.filter((item) => item.id !== key.id));
  };

  return (
    <section id="api-keys" className="mx-auto mt-10 max-w-[760px]">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">
            Thred agent keys
          </p>
          <h2 className="mt-2 text-[26px] tracking-[-.05em] text-[#20221f]">
            Keys for your agents.
          </h2>
          <p className="mt-2 max-w-[440px] text-[12px] leading-5 text-[#73776f]">
            Give each agent or environment its own key, so access stays easy to
            manage as your team grows.
          </p>
        </div>
        <button
          onClick={() => void create()}
          className="landing-cta cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733]"
        >
          Create key
        </button>
      </div>
      {revealedKey && (
        <div className="mt-6 rounded-[10px] bg-[#f4f5f1] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[#2a2d28]">
                Your new Thred agent key
              </p>
              <p className="mt-1 text-[11px] text-[#72766e]">
                Copy it now — it will not be shown again.
              </p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(revealedKey);
                setCopied(true);
              }}
              className="landing-cta shrink-0 cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#343733]"
            >
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
          <code className="mt-4 block break-all rounded-[6px] bg-white px-3 py-3 text-[12px] text-[#373a35]">
            {revealedKey}
          </code>
        </div>
      )}
      <div className="mt-7 divide-y divide-[#e8ebe6]">
        {loading ? (
          <div className="flex items-center gap-2 py-5 text-[13px] text-[#858881]">
            <span className="size-3 animate-pulse rounded-full bg-[#cbd1ca]" />
            Loading keys…
          </div>
        ) : keys.length ? (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-[13px] font-medium text-[#30322f]">
                  {key.name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[#8a8d87]">
                  {key.keyPrefix}••••••••{" "}
                  {key.lastUsedAt
                    ? `· used ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(key.lastUsedAt))}`
                    : "· not used yet"}
                </p>
              </div>
              {key.revokedAt ? (
                <span className="text-[11px] text-[#999b96]">revoked</span>
              ) : (
                <button
                  onClick={() => void revoke(key)}
                  className="cursor-pointer rounded-[5px] bg-[#f3f4f1] px-2.5 py-1.5 text-[11px] font-medium text-[#5f645d] transition-colors hover:bg-[#ebece8] hover:text-[#1d211e]"
                >
                  Revoke
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="my-5 rounded-[10px] border border-dashed border-[#dce1db] bg-[#f7f8f6] p-5">
            <KeyRound className="size-4 text-[#777d75]" />
            <p className="mt-3 text-[13px] font-medium text-[#333630]">No keys yet.</p>
            <p className="mt-1 text-[12px] leading-5 text-[#73776f]">Create your first key, copy it once, then add it to an agent&apos;s MCP configuration.</p>
          </div>
        )}
      </div>
    </section>
  );
}

const providerOptions = [
  { id: "openai", label: "OpenAI", model: "gpt-5-mini", baseUrl: "https://api.openai.com/v1", needsKey: true },
  { id: "groq", label: "Groq (free tier)", model: "openai/gpt-oss-20b", baseUrl: "https://api.groq.com/openai/v1", needsKey: true },
  { id: "xai", label: "xAI / Grok", model: "grok-4-1-fast-reasoning", baseUrl: "https://api.x.ai/v1", needsKey: true },
  { id: "openrouter", label: "OpenRouter", model: "openai/gpt-oss-20b:free", baseUrl: "https://openrouter.ai/api/v1", needsKey: true },
  { id: "ollama", label: "Ollama (local, no key)", model: "llama3.2", baseUrl: "http://localhost:11434/v1", needsKey: false },
  { id: "custom", label: "Custom OpenAI-compatible", model: "", baseUrl: "", needsKey: true },
] as const;

function ProviderKeys({
  workspace,
  request,
}: {
  workspace: Workspace;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [provider, setProvider] = useState("groq");
  const selected = providerOptions.find((item) => item.id === provider)!;
  const [model, setModel] = useState<string>(selected.model);
  const [baseUrl, setBaseUrl] = useState<string>(selected.baseUrl);
  const [label, setLabel] = useState<string>(selected.label);
  const [key, setKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await request(`/api/workspaces/${workspace.slug}/providers`);
    if (response.ok) setCredentials(((await response.json()) as { providers: ProviderCredential[] }).providers);
  };
  useEffect(() => { void load(); }, [workspace.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeProvider = (value: string) => {
    const next = providerOptions.find((item) => item.id === value)!;
    setProvider(value); setModel(next.model); setBaseUrl(next.baseUrl); setLabel(next.label); setKey(""); setMessage(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    const response = await request(`/api/workspaces/${workspace.slug}/providers`, {
      method: "PUT", body: JSON.stringify({ provider, model, baseUrl, label, key: key || undefined }),
    });
    const result = await response.json().catch(() => ({})) as { provider?: ProviderCredential; error?: string };
    if (response.ok && result.provider) { setCredentials((current) => [result.provider!, ...current.filter((item) => item.provider !== provider)]); setKey(""); setMessage("Saved securely."); }
    else setMessage(result.error ?? "Could not save provider.");
    setSaving(false);
  };
  const remove = async (item: ProviderCredential) => {
    const response = await request(`/api/workspaces/${workspace.slug}/providers?provider=${encodeURIComponent(item.provider)}`, { method: "DELETE" });
    if (response.ok) setCredentials((current) => current.filter((entry) => entry.provider !== item.provider));
  };
  return (
    <section className="mx-auto mt-8 max-w-[620px] border-t border-[#e2e6df] pt-7 text-left">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">BYOK · model providers</p>
      <h2 className="mt-2 text-[22px] tracking-[-.05em] text-[#20221f]">Bring your own model key.</h2>
      <p className="mt-2 text-[12px] leading-5 text-[#73776f]">Keys are encrypted before storage and never returned. Ollama runs locally without a key; Groq and OpenRouter often have free models with provider limits.</p>
      <div className="mt-5 space-y-2">
        {credentials.map((item) => (
          <div key={item.provider} className="flex items-center gap-3 rounded-[8px] bg-[#f4f5f2] px-3 py-2.5 text-[12px]">
            <span className="min-w-0 flex-1"><strong className="font-medium text-[#30332e]">{item.label}</strong><span className="ml-2 text-[#777d75]">{item.model} · {item.keyHint}</span></span>
            <button type="button" onClick={() => void remove(item)} className="text-[#8a4f47] hover:text-[#6d302b]">Remove</button>
          </div>
        ))}
      </div>
      <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-3 rounded-[10px] bg-[#f4f5f2] p-4">
        <label className="text-[11px] font-medium text-[#454a43]">Provider<select value={provider} onChange={(event) => changeProvider(event.target.value)} className="mt-1.5 w-full rounded-[6px] border border-[#dfe3dc] bg-white px-2.5 py-2 text-[12px] font-normal">{providerOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-[11px] font-medium text-[#454a43]">Model<input value={model} onChange={(event) => setModel(event.target.value)} required className="mt-1.5 w-full rounded-[6px] border border-[#dfe3dc] bg-white px-2.5 py-2 text-[12px] font-normal" placeholder="Model ID" /></label>
        <label className="text-[11px] font-medium text-[#454a43]">Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} required={provider === "custom"} className="mt-1.5 w-full rounded-[6px] border border-[#dfe3dc] bg-white px-2.5 py-2 text-[12px] font-normal" placeholder="https://api.example.com/v1" /></label>
        <label className="text-[11px] font-medium text-[#454a43]">Label<input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-1.5 w-full rounded-[6px] border border-[#dfe3dc] bg-white px-2.5 py-2 text-[12px] font-normal" /></label>
        {selected.needsKey && <label className="text-[11px] font-medium text-[#454a43]">Provider API key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} required={!credentials.some((item) => item.provider === provider)} className="mt-1.5 w-full rounded-[6px] border border-[#dfe3dc] bg-white px-2.5 py-2 text-[12px] font-normal" placeholder={credentials.some((item) => item.provider === provider) ? "Leave blank to keep current key" : "Paste provider key"} /></label>}
        {message && <p className={`text-[11px] ${message.includes("securely") ? "text-[#477152]" : "text-red-600"}`}>{message}</p>}
        <button disabled={saving} className="mt-1 w-fit rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save provider"}</button>
      </form>
    </section>
  );
}

function AgentPrompts({ workspace }: { workspace: Workspace }) {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const prompts = [
    {
      name: "Claude Code",
      icon: "claude",
      prompt: `Connect to Thred for the ${workspace.name} workspace using the THRED_API_KEY I provide. Before starting work, retrieve the current workspace context. Before you finish or hand work off, call thred_checkpoint with the goal, progress, decisions, evidence, blockers, and exact next step. Configure model credentials separately under BYOK providers.`,
    },
    {
      name: "Cursor",
      icon: "cursor",
      prompt: `Connect to Thred for ${workspace.name} using my THRED_API_KEY. Read the workspace context before making changes. When the work is ready to hand off, save a thred_checkpoint with the changed files, decisions, evidence, blockers, and next step so the next agent can continue immediately. The model provider is configured separately with BYOK.`,
    },
    {
      name: "Codex",
      icon: "codex",
      prompt: `Use Thred as the shared memory for ${workspace.name}. Configure it with the THRED_API_KEY I provide, then retrieve the current context before you begin. At each meaningful handoff, call thred_checkpoint with a concise summary, decisions, verification, open risks, and next action. Provider credentials are configured separately under BYOK.`,
    },
  ];

  return (
    <>
      <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
        Agent instructions
      </p>
      <h1 className="mx-auto mt-3 max-w-[520px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
        Start every agent with context.
      </h1>
      <p className="mx-auto mt-4 max-w-[540px] text-center text-[13px] leading-6 text-[#73766f]">
        Choose your tool, copy its instructions, and each agent will pick up the
        work with the context it needs.
      </p>
      <div className="mx-auto mt-9 max-w-[760px] space-y-3">
        {prompts.map((item) => (
          <article
            key={item.name}
            className="rounded-[11px] bg-[#f4f5f2] p-4 sm:flex sm:items-start sm:justify-between sm:gap-5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-white text-[#3c403b]">
                  {item.icon === "claude" ? (
                    <SiClaude className="size-3" />
                  ) : item.icon === "cursor" ? (
                    <SiCursor className="size-3" />
                  ) : (
                    <CodexMark />
                  )}
                </span>
                <p className="text-[13px] font-medium text-[#282b27]">
                  {item.name}
                </p>
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-[#6f736c]">
                {item.prompt}
              </p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(item.prompt);
                setCopied(item.name);
              }}
              aria-label={
                copied === item.name
                  ? "Copied"
                  : `Copy ${item.name} instructions`
              }
              title={copied === item.name ? "Copied" : "Copy instructions"}
              className="mt-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] bg-[#1b1d1b] text-white sm:mt-0 sm:shrink-0"
            >
              {copied === item.name ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <Copy className="size-3" aria-hidden="true" />
              )}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

const docsNav = [
  ["quickstart", "Quickstart"],
  ["codebase", "In your codebase"],
  ["providers", "BYOK providers"],
  ["prompt", "In your agent prompt"],
  ["save", "Save a handoff"],
  ["resume", "Resume a handoff"],
  ["reference", "MCP reference"],
] as const;

function DocsPage({ workspace }: { workspace: Workspace }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (name: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(name);
  };
  const config = mcpServerConfig();
  const prompt = `Before you begin, retrieve the current Thred context. When work is ready to pass on, call thred_checkpoint with the task, decisions, evidence, blockers, and exact next step.`;
  const Code = ({ name, children }: { name: string; children: string }) => (
    <div className="relative mt-5 overflow-hidden rounded-[11px] bg-[#20221f] p-5 pr-20 font-mono text-[11px] leading-6 text-[#e9ece7] shadow-[0_12px_28px_rgba(25,30,26,.1)]">
      <button
        onClick={() => void copy(name, children)}
        className="absolute right-3 top-3 cursor-pointer rounded-[5px] bg-white/10 px-2 py-1 font-sans text-[10px] text-white hover:bg-white/20"
      >
        {copied === name ? "Copied" : "Copy"}
      </button>
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  );
  const Section = ({
    id,
    eyebrow,
    title,
    children,
  }: {
    id: string;
    eyebrow: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <section
      id={id}
      className="scroll-mt-20 border-t border-[#e7eae5] py-14 first:border-t-0 first:pt-0"
    >
      <p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#7d827a]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[28px] leading-[1.02] tracking-[-.055em] text-[#1d201d] sm:text-[34px]">
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="grid max-w-none gap-10 text-[#252824] lg:grid-cols-[210px_minmax(0,760px)] lg:gap-10">
      <aside className="hidden px-7 py-1 lg:block">
        <div className="sticky top-20 border-l border-[#dfe3dc] pl-4">
          <p className="text-[11px] font-medium text-[#3f433d]">Docs</p>
          <nav className="mt-3 space-y-1">
            {docsNav.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block text-[11px] text-[#858a82] transition-colors hover:text-[#20231f]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
      <article className="min-w-0">
        <div className="pb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
            Thred docs
          </p>
          <h1 className="mx-auto mt-3 max-w-[520px] text-[30px] leading-[1.02] tracking-[-.06em] sm:text-[38px]">
            Bring context into every handoff.
          </h1>
          <p className="mx-auto mt-4 max-w-[540px] text-[13px] leading-6 text-[#555b53]">
            Everything your agents need to save useful work and let the next one
            resume it.
          </p>
        </div>
        <Section
          id="quickstart"
          eyebrow="01 · Quickstart"
          title="Connect an agent in three moves."
        >
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
      "Create a Thred agent key",
              "Add the MCP config",
              "Save your first handoff",
            ].map((item, index) => (
              <div key={item} className="rounded-[10px] bg-[#f4f5f2] p-4">
                <span className="text-[10px] font-medium text-[#8a9087]">
                  0{index + 1}
                </span>
                <p className="mt-3 text-[13px] font-medium text-[#282b27]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </Section>
        <Section
          id="codebase"
          eyebrow="02 · In your codebase"
          title="Add Thred to the agent you already use."
        >
          <p className="mt-4 text-[14px] leading-6 text-[#424740]">
            Paste this into your MCP client configuration, then add the Thred
            agent key from this workspace. Provider keys are configured
            separately under BYOK providers.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[12px] bg-[#D87551] text-[#FFF7F1]">
              <SiClaude className="size-5" />
            </span>
            <span className="grid size-10 place-items-center rounded-[12px] bg-[#1c211e]">
              <Mark className="size-5" />
            </span>
            <span className="grid size-10 place-items-center overflow-hidden rounded-[12px] bg-white shadow-[0_4px_12px_rgba(25,30,26,.08)]">
              <CodexMark />
            </span>
          </div>
          <Code name="config">{config}</Code>
        </Section>
        <Section
          id="providers"
          eyebrow="02 · BYOK model providers"
          title="Bring your own model key."
        >
          <p className="mt-4 text-[14px] leading-6 text-[#424740]">
            Configure the model key Thred should use for extraction and
            evaluation. Keys are encrypted before storage and never returned.
            Ollama runs locally without a key; Groq and OpenRouter often have
            free models with provider limits.
          </p>
          <Code name="byok">{`Provider: Groq (free tier)
Model: openai/gpt-oss-20b
Base URL: https://api.groq.com/openai/v1
Label: Groq (free tier)
API key: Paste provider key

Save provider`}</Code>
        </Section>
        <Section
          id="prompt"
          eyebrow="04 · In your agent prompt"
          title="Tell the agent when memory matters."
        >
          <p className="mt-4 text-[14px] leading-6 text-[#424740]">
            Put this in your project instructions or first message. It gives
            every agent the same handoff discipline.
          </p>
          <Code name="prompt">{prompt}</Code>
        </Section>
        <Section
          id="save"
          eyebrow="05 · Save a handoff"
          title="Checkpoint work before the context disappears."
        >
          <p className="mt-4 text-[14px] leading-6 text-[#424740]">
            When an agent finishes a meaningful step, it saves the facts the
            next agent cannot safely guess.
          </p>
          <Code name="checkpoint">{`thred_checkpoint({
  task: "Finish Google OAuth onboarding",
  decisions: ["Use Google-only sign in"],
  evidence: ["OAuth callback tested locally"],
  blockers: [],
  nextStep: "Add the production redirect URL"
})`}</Code>
        </Section>
        <Section
          id="resume"
          eyebrow="06 · Resume a handoff"
          title="Pick up exactly where work stopped."
        >
          <p className="mt-4 text-[14px] leading-6 text-[#424740]">
            A new agent reads the saved context first, then continues with the
            task, decisions, evidence, and next step already in view.
          </p>
          <div className="mt-5 overflow-hidden rounded-[11px] bg-[#1c211e] p-5 font-mono text-[11px] leading-6 text-[#dce1da] shadow-[0_12px_28px_rgba(25,30,26,.1)]">
            <p className="text-[#99a997]">$ codex</p>
            <p className="mt-2 text-white">
              › Retrieve Thred context for {workspace.name}
            </p>
            <p className="text-[#a8b4a5]">
              ✓ 1 open handoff · next step loaded
            </p>
            <p className="mt-2 text-white">
              › Continue from the saved checkpoint
            </p>
          </div>
        </Section>
        <Section
          id="reference"
          eyebrow="07 · MCP reference"
          title="The small toolset behind the handoff."
        >
          <div className="mt-5 divide-y divide-[#e7eae5] rounded-[10px] bg-[#f4f5f2] px-4">
            {[
              [
                "thred_checkpoint",
                "Save a resumable task, decisions, evidence, and next step.",
              ],
              [
                "thred_context",
                "Retrieve the current workspace context before you begin.",
              ],
              ["thred_search", "Find prior decisions and supporting evidence."],
            ].map(([tool, description]) => (
              <div key={tool} className="py-4">
                <code className="text-[12px] font-medium text-[#252824]">
                  {tool}
                </code>
                <p className="mt-1 text-[12px] leading-5 text-[#62675f]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </article>
    </div>
  );
}

function DashboardFromQuery() {
  const searchParams = useSearchParams();
  return (
    <DashboardContent
      isHeroFromQuery={searchParams.get("preview") === "hero"}
      previewView={searchParams.get("view")}
    />
  );
}

function DashboardContent({
  preview = false,
  isHeroFromQuery = false,
  previewView = null,
}: {
  preview?: boolean;
  isHeroFromQuery?: boolean;
  previewView?: string | null;
}) {
  const router = useRouter();
  const isHeroPreview = preview || isHeroFromQuery;
  const initialView: View =
    previewView === "handoffs" ||
    previewView === "mcp" ||
    previewView === "apiKeys" ||
    previewView === "providers" ||
    previewView === "prompts" ||
    previewView === "docs" ||
    previewView === "settings"
      ? previewView
      : "overview";
  const { data: session, isPending } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(isHeroPreview ? [heroPreviewWorkspace] : []);
  const [workspace, setWorkspace] = useState<Workspace | null>(isHeroPreview ? heroPreviewWorkspace : null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(isHeroPreview ? heroPreviewOverview : null);
  const [view, setView] = useState<View>(initialView);
  const [loading, setLoading] = useState(!isHeroPreview);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const hour = new Date().getHours();
  const salutation =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (
    session?.user?.name ??
    session?.user?.email ??
    (isHeroPreview ? "Nikhil" : "there")
  )
    .split(" ")[0]
    .split("@")[0];
  const accountName =
    session?.user?.name ??
    session?.user?.email ??
    (isHeroPreview ? "Nikhil Rajpurohit" : "");
  const request = (path: string, init?: RequestInit) =>
    fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });

  useEffect(() => {
    if (isHeroPreview) {
      setWorkspaces([heroPreviewWorkspace]);
      setWorkspace(heroPreviewWorkspace);
      setOverview(heroPreviewOverview);
      setLoading(false);
      return;
    }
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
      return;
    }
    if (!session?.user) return;
    void (async () => {
      const response = await request("/api/workspaces");
      if (response.ok) {
        const data = (await response.json()) as { workspaces: Workspace[] };
        setWorkspaces(data.workspaces);
        if (data.workspaces[0]) setWorkspace(data.workspaces[0]);
        else router.replace("/workspace");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeroPreview, isPending, session?.user?.id]);

  useEffect(() => {
    if (isHeroPreview) return;
    if (!workspace) return;
    void (async () => {
      const response = await request(
        `/api/workspaces/${workspace.slug}/overview`,
      );
      if (response.ok) setOverview((await response.json()) as Overview);
      else setOverview(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeroPreview, workspace?.slug]);

  useEffect(() => {
    if (workspace) {
      setSettingsName(workspace.name);
      setSettingsMessage(null);
    }
  }, [workspace]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [view]);

  const createWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) {
      setWorkspaceError("Give your workspace a name.");
      return;
    }
    setCreatingWorkspace(true);
    setWorkspaceError(null);
    const response = await request("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setWorkspaceError(body?.error ?? "Couldn’t create the workspace.");
      setCreatingWorkspace(false);
      return;
    }
    const { workspace: created } = (await response.json()) as {
      workspace: Workspace;
    };
    setWorkspaces((current) => [created, ...current]);
    setWorkspace(created);
    setWorkspaceName("");
    setNewWorkspaceOpen(false);
    setCreatingWorkspace(false);
  };

  const saveWorkspaceSettings = async () => {
    const name = settingsName.trim();
    if (!name) {
      setSettingsMessage("Give your workspace a name.");
      return;
    }
    setSavingSettings(true);
    setSettingsMessage(null);
    if (!workspace) return;
    const response = await request(`/api/workspaces/${workspace.slug}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const body = (await response.json().catch(() => null)) as {
      workspace?: Workspace;
      error?: string;
    } | null;
    if (!response.ok || !body?.workspace) {
      setSettingsMessage(body?.error ?? "Couldn’t save those settings.");
      setSavingSettings(false);
      return;
    }
    setWorkspace(body.workspace);
    setWorkspaces((current) =>
      current.map((item) =>
        item.id === body.workspace!.id ? body.workspace! : item,
      ),
    );
    setSettingsMessage("Saved.");
    setSavingSettings(false);
  };

  if (!isHeroPreview && (isPending || loading || !workspace)) return <DashboardSkeleton />;
  if (!isHeroPreview && !workspace) return <DashboardSkeleton />;
  if (!workspace) return null;
  return (
    <main className={`${isHeroPreview ? "grid h-[1100px] min-h-0 grid-cols-[224px_minmax(0,1fr)] overflow-hidden" : "min-h-screen lg:grid lg:grid-cols-[224px_minmax(0,1fr)]"} bg-[#f1f2f0] text-[#242622]`}>
      {!isHeroPreview && <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className={`fixed inset-0 z-40 bg-[#172018]/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />}
      <aside className={`flex w-[280px] flex-col bg-[#f1f2f0] px-4 py-3 ${isHeroPreview ? "relative h-full min-h-full w-auto translate-x-0 shadow-none" : `fixed inset-y-0 left-0 z-50 min-h-screen shadow-[18px_0_50px_rgba(20,28,22,.18)] transition-transform duration-300 ease-out will-change-transform ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:min-h-0 lg:translate-x-0 lg:self-start lg:overflow-y-auto lg:shadow-none`}`}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-2 text-[19px] font-semibold tracking-[-.07em]"
          >
            <Mark />
            thred
          </Link>
          <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="grid size-8 cursor-pointer place-items-center rounded-[7px] text-[#666c64] hover:bg-[#e2e6e0] lg:hidden"><X className="size-4" /></button>
        </div>
        <div className="mt-8">
          <p className="px-2 text-[10px] font-medium text-[#5f635d]">
            Workspace
          </p>
          <nav className="mt-2 space-y-0.5">
            <button
              onClick={() => setView("overview")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors ${view === "overview" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#eff1ee] hover:text-[#20221f]"}`}
            >
              <LayoutDashboard
                className="size-4 text-[#7b8079]"
                strokeWidth={1.8}
              />
              Overview
            </button>
            <button
              onClick={() => setView("handoffs")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors ${view === "handoffs" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#eff1ee] hover:text-[#20221f]"}`}
            >
              <GitFork className="size-4 text-[#7b8079]" strokeWidth={1.8} />
              Handoffs
            </button>
          </nav>
        </div>
        <div className="mt-8">
          <p className="px-2 text-[10px] font-medium text-[#5f635d]">
            Configure
          </p>
          <nav className="mt-2 space-y-0.5">
            <button
              onClick={() => setView("mcp")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors duration-150 ${view === "mcp" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <SiModelcontextprotocol className="size-4 shrink-0 text-[#4f544e]" />
              MCP connection
            </button>
            <button
              onClick={() => setView("apiKeys")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors duration-150 ${view === "apiKeys" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <KeyRound className="size-4 text-[#7b8079]" strokeWidth={1.8} />
              Thred agent keys
            </button>
            <button
              onClick={() => setView("providers")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors duration-150 ${view === "providers" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <SlidersHorizontal className="size-4 text-[#7b8079]" strokeWidth={1.8} />
              BYOK providers
            </button>
            <button
              onClick={() => setView("prompts")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors duration-150 ${view === "prompts" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <MessageSquareText
                className="size-4 text-[#7b8079]"
                strokeWidth={1.8}
              />
              Agent instructions
            </button>
          </nav>
        </div>
        <div className="mt-7">
          <p className="px-2 text-[10px] font-medium text-[#5f635d]">
            Documentation
          </p>
          <nav>
            <button
              onClick={() => setView("docs")}
              className={`mt-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors ${view === "docs" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <BookOpen className="size-4 text-[#7b8079]" strokeWidth={1.8} />
              Docs
            </button>
          </nav>
        </div>
        <div className="mt-7">
          <p className="px-2 text-[10px] font-medium text-[#5f635d]">
            Workspace
          </p>
          <nav className="mt-2 space-y-0.5">
            <button
              onClick={() => setView("settings")}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[11px] transition-colors duration-150 ${view === "settings" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}
            >
              <Settings className="size-4 text-[#7b8079]" strokeWidth={1.8} />
              Settings
            </button>
          </nav>
        </div>
        <div className="mt-auto pt-8">
          <div className="relative mb-2">
            {workspaceSwitcherOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-[13px] border border-[#e2e5e0] bg-white p-1.5 shadow-[0_12px_28px_rgba(29,40,31,.13)]">
                {workspaces.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setWorkspace(item);
                      setWorkspaceSwitcherOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center rounded-[8px] px-2.5 py-2 text-left text-[11px] transition-colors ${item.id === workspace.id ? "bg-[#eef0ed] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#f4f5f2] hover:text-[#20221f]"}`}
                  >
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setWorkspaceSwitcherOpen((open) => !open)}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-[9px] bg-[#e8ebe7] px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-[#e1e5df] ${workspaceSwitcherOpen ? "bg-[#e1e5df]" : ""}`}
              aria-expanded={workspaceSwitcherOpen}
              aria-haspopup="menu"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-white/80 text-[#6d746b]">
                <Layers3 className="size-3" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[#5f645d]">
                {workspace.name}
              </span>
              <ChevronDown
                className={`size-3 shrink-0 text-[#777c75] transition-transform duration-200 ${workspaceSwitcherOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <div className="relative">
            {accountMenuOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 rounded-[13px] border border-[#e2e5e0] bg-white p-2 shadow-[0_12px_28px_rgba(29,40,31,.13)]">
                <div className="px-2 pb-2">
                  <p className="min-w-0 truncate text-[11px] font-medium text-[#252824]">
                    {accountName}
                  </p>
                </div>
                <div className="space-y-0.5 border-t border-[#eceeea] pt-1">
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView("settings");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[10px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"
                  >
                    <span className="grid size-4 shrink-0 place-items-center">
                      <SlidersHorizontal className="size-3.5" />
                    </span>
                    Workspace settings
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView("apiKeys");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[10px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"
                  >
                    <span className="grid size-4 shrink-0 place-items-center">
                      <KeyRound className="size-3.5" />
                    </span>
                    Thred agent keys
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView("providers");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[10px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"
                  >
                    <span className="grid size-4 shrink-0 place-items-center"><SlidersHorizontal className="size-3.5" /></span>
                    BYOK providers
                  </button>
                  <button
                    onClick={async () => {
                      await signOut();
                      router.replace("/");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[10px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"
                  >
                    <span className="grid size-4 shrink-0 place-items-center">
                      <LogOut className="size-3.5" />
                    </span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left text-[11px] text-[#656963] transition-colors hover:bg-[#e7eae5] ${accountMenuOpen ? "bg-[#e7eae5]" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate">{accountName}</span>
              <ChevronDown
                className={`size-3 transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </aside>
      <section className="min-w-0 bg-white">
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-2 bg-[#f1f2f0] px-4 sm:px-5 lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="grid size-8 cursor-pointer place-items-center rounded-[7px] text-[#4d534c] transition hover:bg-[#e3e7e1]">
              <Menu className="size-4" />
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-[14px] font-semibold tracking-[-.055em]">
              <Mark className="size-5" />
              thred
            </Link>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="landing-cta inline-flex cursor-pointer items-center gap-2 rounded-[6px] bg-[#1b1d1b] px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_3px_9px_rgba(25,28,25,.14)] hover:bg-[#343733]"
          >
            <span className="text-[12px] font-semibold leading-none">𝕏</span>
            <span className="hidden sm:inline">Share Thred</span>
          </button>
          <a
            href="https://buymeacoffee.com/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium text-[#545950] transition-colors hover:bg-[#e4e7e2] hover:text-[#20231f] sm:inline-flex"
          >
            <Coffee className="size-3.5" strokeWidth={2} />
            Buy us a coffee
          </a>
          </div>
        </header>
        <div className={`bg-white ${isHeroPreview ? "min-h-[calc(1100px-48px)]" : "min-h-[calc(100vh-48px)] lg:rounded-tl-[80px]"}`}>
          <div
            className={
              view === "docs"
                ? "max-w-none py-14 sm:py-16"
                : "mx-auto max-w-[940px] px-7 py-14 sm:px-12 sm:py-16"
            }
          >
            {view === "overview" && (
              <section className="flex min-h-[calc(100vh-220px)] flex-col justify-center">
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
                  Workspace overview
                </p>
                <h1 className="mx-auto mt-3 max-w-[500px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
                  {salutation}, {firstName}.
                </h1>
                <p className="mx-auto mt-4 max-w-[535px] text-center text-[13px] font-medium leading-6 text-[#686c66]">
                  Your workspace keeps every agent oriented around the work in
                  motion.
                </p>
                <section className="mx-auto mt-10 max-w-[820px] px-6 py-3 sm:px-10">
                  <p className="text-center text-[10px] font-medium uppercase tracking-[.16em] text-[#7e867c]">
                    One shared context stream
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-2.5 sm:gap-5">
                    <span className="grid size-12 place-items-center rounded-[14px] bg-[#D87551] text-[#FFF7F1] shadow-[0_6px_18px_rgba(39,57,43,.08)]">
                      <SiClaude className="size-5" />
                    </span>
                    <span className="text-lg text-[#8f9990]">→</span>
                    <span className="grid size-[56px] place-items-center rounded-[17px] bg-[#1c211e] shadow-[0_8px_20px_rgba(24,42,29,.18)]">
                      <Mark className="size-7" />
                    </span>
                    <span className="text-lg text-[#8f9990]">→</span>
                    <span className="grid size-12 place-items-center rounded-[14px] bg-white shadow-[0_6px_18px_rgba(39,57,43,.08)]">
                      <HydraMark />
                    </span>
                    <span className="text-lg text-[#8f9990]">→</span>
                    <span className="grid size-12 place-items-center overflow-hidden rounded-[14px] bg-white shadow-[0_6px_18px_rgba(39,57,43,.08)]">
                      <CodexMark />
                    </span>
                  </div>
                  <div className="mx-auto mt-3 grid max-w-[440px] grid-cols-4 text-center text-[10px] font-medium text-[#81877f]">
                    <span>Claude</span><span>Thred</span><span>Memory</span><span>Codex</span>
                  </div>
                  <p className="mt-5 text-center text-[12px] text-[#697067]">
                    Your agent saves the state once. The next one resumes with
                    the decisions, evidence, and next step.
                  </p>
                </section>
                <div className="mx-auto mt-7 flex max-w-[260px] items-center justify-center gap-3 text-[#9ca39a]">
                  <button
                    type="button"
                    onClick={() => setView("apiKeys")}
                    title="Create and copy a Thred agent key"
                    aria-label="Open Thred agent keys"
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-[#e0e4de] bg-white transition hover:border-[#abb5a8] hover:bg-[#f3f6f1] hover:text-[#596857]"
                  ><KeyRound className="size-3.5" /></button>
                  <span className="h-px flex-1 bg-[#dfe4dd]" />
                  <button
                    type="button"
                    onClick={() => setView("handoffs")}
                    title="View saved handoffs"
                    aria-label="Open handoffs"
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-[#d5ddd3] bg-[#f1f4ef] transition hover:border-[#abb5a8] hover:bg-[#e9f0e7] hover:text-[#596857]"
                  ><Mark className="size-4" /></button>
                  <span className="h-px flex-1 bg-[#dfe4dd]" />
                  <button
                    type="button"
                    onClick={() => setView("mcp")}
                    title="Finish your MCP connection"
                    aria-label="Open MCP connection"
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-[#e0e4de] bg-white transition hover:border-[#abb5a8] hover:bg-[#f3f6f1] hover:text-[#596857]"
                  ><SiModelcontextprotocol className="size-4" /></button>
                </div>
                <div className="mx-auto mt-4 max-w-[620px] py-3 text-center">
                  <div>
                    <p className="flex items-center justify-center gap-2 text-[14px] font-medium text-[#30322f]">
                      {!overview?.metrics.agentCount && <span className="size-1.5 rounded-full bg-[#a5b49f]" />}
                      {overview?.metrics.agentCount
                        ? `${overview.metrics.agentCount} agent session${overview.metrics.agentCount === 1 ? "" : "s"} connected.`
                        : "Your workspace is ready."}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[#73776f]">
                      {overview?.metrics.agentCount
                        ? `${overview.metrics.checkpointCount} resumable handoff${overview.metrics.checkpointCount === 1 ? "" : "s"} in this workspace.`
                        : "Create a Thred agent key to connect your first agent."}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      overview?.metrics.agentCount
                        ? setView("handoffs")
                        : setSetupOpen(true)
                    }
                    className="landing-cta mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733]"
                  >
                    {overview?.metrics.agentCount
                      ? "Manage handoffs"
                      : "Set up handoffs"}
                    <ArrowRight className="size-3" />
                  </button>
                </div>
                {overview?.latestCheckpoints.length ? (
                  <section className="mt-11 w-full">
                    <p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">
                      Latest handoffs
                    </p>
                    <div className="mt-4 divide-y border-y border-[#e6e9e4]">
                      {overview.latestCheckpoints.map((checkpoint) => (
                        <div key={checkpoint.id} className="py-4">
                          <p className="text-[13px] font-medium text-[#30322f]">
                            {checkpoint.task}
                          </p>
                          <p className="mt-1 text-[12px] text-[#73776f]">
                            {checkpoint.payload?.nextStep ??
                              `${checkpoint.status.toLowerCase()} · ${checkpoint.session.agent.toLowerCase()}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </section>
            )}
            {view === "handoffs" && (
              <>
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
                  Handoffs
                </p>
                <h1 className="mx-auto mt-3 max-w-[500px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
                  Ready for the next agent.
                </h1>
                <p className="mx-auto mt-4 max-w-[520px] text-center text-[13px] font-medium leading-6 text-[#686c66]">
                  Every checkpoint your agents save becomes a resumable piece of
                  work here.
                </p>
                <div className="mx-auto mt-10 max-w-[760px] divide-y border-y border-[#e3e7e1] text-left">
                  {overview?.latestCheckpoints.length ? (
                    overview.latestCheckpoints.map((checkpoint) => (
                      <article key={checkpoint.id} className="py-5">
                        <p className="text-[14px] font-medium text-[#2a2d29]">
                          {checkpoint.task}
                        </p>
                        <p className="mt-1 text-[12px] text-[#73776f]">
                          {checkpoint.payload?.nextStep ??
                            `${checkpoint.status.toLowerCase()} · saved by ${checkpoint.session.agent.toLowerCase()}`}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="my-6 rounded-[12px] bg-[#f4f5f2] p-5 sm:p-6">
                      <div className="flex items-center gap-2 text-[#667063]">
                        <span className="grid size-8 place-items-center rounded-[9px] bg-white shadow-[0_3px_10px_rgba(25,30,26,.06)]"><SiClaude className="size-3.5" /></span>
                        <ArrowRight className="size-3" />
                        <span className="grid size-8 place-items-center rounded-[9px] bg-[#1c211e]"><Mark className="size-4" /></span>
                        <ArrowRight className="size-3" />
                        <span className="grid size-8 place-items-center rounded-[9px] bg-white shadow-[0_3px_10px_rgba(25,30,26,.06)]"><SiCursor className="size-3.5" /></span>
                      </div>
                      <p className="mt-5 text-[14px] font-medium text-[#30332e]">No handoffs yet.</p>
                      <p className="mt-1 max-w-[510px] text-[12px] leading-5 text-[#73776f]">
                        Connect your agent, let it complete a meaningful step, then save the task, decisions, evidence, and exact next move with{" "}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#454a43]">thred_checkpoint</code>.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {view === "mcp" && (
              <>
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
                  MCP connection
                </p>
                <h1 className="mx-auto mt-3 max-w-[500px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
                  Bring Thred into your agent.
                </h1>
                <p className="mx-auto mt-4 max-w-[540px] text-center text-[13px] leading-6 text-[#73766f]">
                  Create a Thred agent key, then add this configuration to
                  Codex, Claude, or Cursor. Configure your model provider
                  separately under BYOK providers.
                </p>
                <div className="mx-auto mt-8 grid max-w-[760px] gap-2 sm:grid-cols-3">
                  {[
                    ["01", "Create a key", <KeyRound key="key" className="size-4" />],
                    ["02", "Add the config", <Link2 key="link" className="size-4" />],
                    ["03", "Save a handoff", <CircleCheck key="check" className="size-4" />],
                  ].map(([number, label, icon]) => (
                    <div key={number as string} className="rounded-[10px] bg-[#f4f5f2] p-3.5 text-left">
                      <div className="flex items-center justify-between text-[#697168]">
                        <span className="text-[10px] font-medium">{number}</span>
                        {icon}
                      </div>
                      <p className="mt-4 text-[12px] font-medium text-[#343833]">{label}</p>
                    </div>
                  ))}
                </div>
                <pre className="mx-auto mt-3 max-w-[760px] overflow-x-auto rounded-[12px] bg-[#20221f] p-5 text-left text-[12px] leading-6 text-[#e8ebe6] shadow-[0_12px_30px_rgba(25,30,26,.12)]">
                  <code>{mcpServerConfig()}</code>
                </pre>
                <p className="mx-auto mt-4 flex max-w-[760px] items-center gap-2 text-[12px] leading-5 text-[#747970]">
                  <CircleCheck className="size-4 shrink-0 text-[#66806b]" />
                  Your agent can now retrieve context before work and save a checkpoint when it hands work over.
                </p>
              </>
            )}
            {view === "apiKeys" && (
              <>
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
                  Thred agent keys
                </p>
                <h1 className="mx-auto mt-3 max-w-[500px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
                  Give your agent access.
                </h1>
                <p className="mx-auto mt-4 max-w-[540px] text-center text-[13px] leading-6 text-[#73766f]">
                  Create one Thred agent key for each agent or environment. The secret is
                  shown only once.
                </p>
                <ApiKeys workspace={workspace} request={request} />
              </>
            )}
            {view === "prompts" && <AgentPrompts workspace={workspace} />}
            {view === "docs" && <DocsPage workspace={workspace} />}
            {view === "settings" && (
              <>
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">
                  Workspace settings
                </p>
                <h1 className="mx-auto mt-3 max-w-[500px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">
                  Make this space yours.
                </h1>
                <p className="mx-auto mt-4 max-w-[520px] text-center text-[13px] font-medium leading-6 text-[#686c66]">
                  Name the place your agents will use to share context,
                  checkpoints, and durable memory.
                </p>
                <div className="mx-auto mt-8 grid max-w-[620px] gap-3 sm:grid-cols-2">
                  <div className="rounded-[10px] bg-[#f4f5f2] p-4 text-left">
                    <Layers3 className="size-4 text-[#687066]" />
                    <p className="mt-3 text-[12px] font-medium text-[#343833]">One shared workspace</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#767b73]">Every key, checkpoint, and memory stays scoped to this space.</p>
                  </div>
                  <div className="rounded-[10px] bg-[#f4f5f2] p-4 text-left">
                    <CircleCheck className="size-4 text-[#687066]" />
                    <p className="mt-3 text-[12px] font-medium text-[#343833]">Easy to keep current</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#767b73]">Rename it anytime as the work, team, or project evolves.</p>
                  </div>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveWorkspaceSettings();
                  }}
                  className="mx-auto mt-7 max-w-[620px] border-t border-[#e2e6df] pt-7 text-left"
                >
                  <label className="block text-[12px] font-medium text-[#3f433d]">
                    <span className="flex items-center gap-1.5"><Layers3 className="size-3.5 text-[#777d75]" /> Workspace name</span>
                    <input
                      value={settingsName}
                      onChange={(event) => {
                        setSettingsName(event.target.value);
                        setSettingsMessage(null);
                      }}
                      className="mt-2 w-full rounded-[7px] border border-[#dfe3dc] bg-white px-3 py-3 text-[13px] text-[#282b27] outline-none transition focus:border-[#767d73] focus:ring-2 focus:ring-[#dce5dc]"
                    />
                  </label>
                  <div className="relative mt-5">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#3f433d]"><Link2 className="size-3.5 text-[#777d75]" /> Switch workspace</p>
                    <button
                      type="button"
                      onClick={() => setWorkspaceSwitcherOpen((open) => !open)}
                      className="mt-2 flex w-full cursor-pointer items-center rounded-[7px] bg-[#f4f5f2] px-3 py-3 text-left text-[13px] text-[#282b27] transition-colors hover:bg-[#ecefea]"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {workspace.name}
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-[#777b74] transition-transform duration-200 ${workspaceSwitcherOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {workspaceSwitcherOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[9px] bg-white p-1.5 shadow-[0_12px_28px_rgba(29,40,31,.16)]">
                        {workspaces.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setWorkspace(item);
                              setWorkspaceSwitcherOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center rounded-[6px] px-2.5 py-2 text-left text-[12px] transition-colors ${item.id === workspace.id ? "bg-[#eef0ed] font-medium text-[#20221f]" : "text-[#62665f] hover:bg-[#f5f6f3]"}`}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {item.name}
                            </span>
                            {item.id === workspace.id && (
                              <Check className="size-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {settingsMessage && (
                    <p
                      className={`mt-4 text-[12px] ${settingsMessage === "Saved." ? "text-[#477152]" : "text-red-600"}`}
                    >
                      {settingsMessage}
                    </p>
                  )}
                  <div className="mt-6 flex items-center gap-5">
                    <button
                      disabled={savingSettings}
                      className="landing-cta cursor-pointer rounded-[6px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingSettings ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceError(null);
                        setNewWorkspaceOpen(true);
                      }}
                      className="cursor-pointer text-[12px] font-medium text-[#666b64] transition-colors hover:text-[#1e211e]"
                    >
                      New workspace
                    </button>
                  </div>
                </form>
              </>
            )}
            {view === "providers" && (
              <>
                <p className="text-center text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Configure · BYOK</p>
                <h1 className="mx-auto mt-3 max-w-[560px] text-center text-[30px] leading-[1.02] tracking-[-.06em] text-[#1b1d1b] sm:text-[36px]">Bring your own model key.</h1>
                <p className="mx-auto mt-4 max-w-[540px] text-center text-[13px] leading-6 text-[#73766f]">Choose the model provider Thred should use for extraction and evaluation. Your provider key stays encrypted in this workspace.</p>
                <ProviderKeys workspace={workspace} request={request} />
              </>
            )}
          </div>
        </div>
      </section>
      {shareOpen && (
        <div
          onClick={() => setShareOpen(false)}
          className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/20 p-5 backdrop-blur-[5px]"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[520px] cursor-default overflow-hidden rounded-[22px] bg-white shadow-[0_28px_90px_rgba(24,32,26,.22)]"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_18%,rgba(187,234,224,.82),transparent_38%),radial-gradient(circle_at_86%_73%,rgba(203,219,126,.64),transparent_42%),radial-gradient(circle_at_52%_96%,rgba(78,154,101,.56),transparent_48%),linear-gradient(135deg,#c6e4d3,#9cc98e)] px-8 py-10">
              <div className="pointer-events-none absolute inset-0 opacity-[.13] [background-image:linear-gradient(90deg,rgba(255,255,255,.85)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.85)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="relative flex items-center justify-center gap-3 sm:gap-5">
                <span className="grid size-12 place-items-center rounded-[15px] bg-[#D87551] text-[#FFF7F1]">
                  <SiClaude className="size-6" />
                </span>
                <span className="text-lg text-[#54745d]">→</span>
                <span className="grid size-[58px] place-items-center rounded-[18px] bg-[#1c211e]">
                  <Mark className="size-7" />
                </span>
                <span className="text-lg text-[#54745d]">→</span>
                <span className="grid size-12 place-items-center rounded-[15px] bg-white">
                  <HydraMark />
                </span>
                <span className="text-lg text-[#54745d]">→</span>
                <span className="grid size-12 place-items-center overflow-hidden rounded-[15px] bg-white">
                  <CodexMark />
                </span>
              </div>
            </div>
            <div className="p-7 sm:p-8">
              <p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">
                Share Thred
              </p>
              <h2 className="mt-3 text-[29px] leading-none tracking-[-.06em] text-[#1d201d]">
                Share the handoff.
              </h2>
              <p className="mt-3 max-w-[390px] text-[13px] leading-5 text-[#73776f]">
                Tell your people that this workspace is ready for every agent.
              </p>
              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  onClick={() => setShareOpen(false)}
                  className="cursor-pointer text-[12px] text-[#777a74] hover:text-[#20221f]"
                >
                  Maybe later
                </button>
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I just set up Thred for ${workspace.name} — shared memory that lets every agent pick up the work with the context it needs. https://thred.dev/share`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-cta inline-flex items-center gap-2 rounded-[7px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white hover:bg-[#343733]"
                >
                  Share on X <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
      {setupOpen && (
        <div
          onClick={() => setSetupOpen(false)}
          className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/20 p-5 backdrop-blur-[5px]"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[480px] cursor-default overflow-hidden rounded-[22px] bg-white shadow-[0_28px_90px_rgba(24,32,26,.22)]"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_20%,rgba(187,234,224,.8),transparent_38%),radial-gradient(circle_at_84%_74%,rgba(203,219,126,.62),transparent_42%),linear-gradient(135deg,#c6e4d3,#9cc98e)] px-7 py-8">
              <div className="pointer-events-none absolute inset-0 opacity-[.13] [background-image:linear-gradient(90deg,rgba(255,255,255,.85)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.85)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="relative mx-auto grid size-14 place-items-center rounded-[18px] bg-[#1c211e] shadow-[0_10px_24px_rgba(24,42,29,.2)]">
                <Mark className="size-7" />
              </div>
            </div>
            <div className="p-7 sm:p-8">
              <p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">
                Start a handoff
              </p>
              <h2 className="mt-3 text-[29px] leading-none tracking-[-.06em] text-[#1d201d]">
                Let’s start with a key.
              </h2>
              <p className="mt-3 text-[13px] leading-5 text-[#73776f]">
                Create a Thred agent key first. Then add Thred to your agent;
                configure a BYOK model provider separately when you want Thred
                to use your own model account.
              </p>
              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSetupOpen(false)}
                  className="cursor-pointer text-[12px] text-[#777a74] hover:text-[#20221f]"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => {
                    setSetupOpen(false);
                    setView("apiKeys");
                  }}
                  className="landing-cta cursor-pointer rounded-[7px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white hover:bg-[#343733]"
                >
                  Create Thred agent key
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {newWorkspaceOpen && (
        <div
          onClick={() => setNewWorkspaceOpen(false)}
          className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/25 p-5 backdrop-blur-[5px]"
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void createWorkspace();
            }}
            className="w-full max-w-[560px] cursor-default overflow-hidden rounded-[24px] border border-white/70 bg-[#fcfcfb] shadow-[0_28px_90px_rgba(24,32,26,.22)]"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(177,234,224,.96),transparent_40%),radial-gradient(circle_at_83%_78%,rgba(199,211,111,.8),transparent_42%),radial-gradient(circle_at_53%_88%,rgba(56,145,84,.82),transparent_47%),linear-gradient(135deg,#b8e0ca,#79b78d)] px-8 py-11 sm:px-12 sm:py-12">
              <div className="pointer-events-none absolute inset-0 opacity-[.16] [background-image:linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="relative flex items-center justify-center gap-3 sm:gap-5">
                <span className="grid size-[58px] place-items-center rounded-[17px] border border-white/70 bg-[#D87551] text-[#FFF7F1] shadow-[0_8px_20px_rgba(38,63,46,.15)]">
                  <SiClaude className="size-7" />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="grid size-[68px] place-items-center rounded-[21px] bg-[#1c211e] shadow-[0_10px_24px_rgba(24,42,29,.24)]">
                  <Mark />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="grid size-[58px] place-items-center rounded-[17px] border border-white/70 bg-white shadow-[0_8px_20px_rgba(38,63,46,.15)]">
                  <HydraMark />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="grid size-[58px] place-items-center overflow-hidden rounded-[17px] border border-white/70 bg-white shadow-[0_8px_20px_rgba(38,63,46,.15)]">
                  <CodexMark />
                </span>
              </div>
            </div>
            <div className="p-7 sm:p-9">
              <p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">
                New workspace
              </p>
              <h2 className="mt-3 text-[30px] tracking-[-.065em] text-[#1d201d]">
                Start a fresh thread.
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[#777a74]">
                Give this workspace a clear project or team name. Your connected
                agents will share its memory.
              </p>
              <label className="mt-6 block text-[12px] font-medium text-[#4e514c]">
                Workspace name
                <input
                  autoFocus
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g. Acme engineering"
                  className="mt-2 w-full rounded-[8px] border border-[#dfe3dc] bg-white px-3 py-3 text-[13px] outline-none placeholder:text-[#a5a8a2] focus:border-[#7c827a]"
                />
              </label>
              {workspaceError && (
                <p className="mt-3 text-[12px] text-red-600">
                  {workspaceError}
                </p>
              )}
              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setNewWorkspaceOpen(false)}
                  className="cursor-pointer text-[12px] text-[#777a74] hover:text-[#20221f]"
                >
                  Maybe later
                </button>
                <button
                  disabled={creatingWorkspace}
                  className="cursor-pointer rounded-[7px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] disabled:opacity-50"
                >
                  {creatingWorkspace ? "Creating…" : "Create workspace"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage({ preview = false }: { preview?: boolean }) {
  if (preview) return <DashboardContent preview />;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardFromQuery />
    </Suspense>
  );
}

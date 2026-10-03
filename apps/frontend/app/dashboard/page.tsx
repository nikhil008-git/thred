"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { SiClaude, SiCursor } from "react-icons/si";
import {
  PixelArrowRight,
  PixelCheck,
  PixelChevronDown,
  PixelCopy,
  PixelFolder,
  PixelKey,
  PixelMenu,
} from "@/components/pixel-icons";
import { signOut, useSession } from "@/lib/auth-client";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useClickOutside } from "@/lib/use-click-outside";

const MCP_PACKAGE = "@thred_nick_01/thred-mcp";
const DEFAULT_PRODUCTION_MCP_API_URL = "https://api.thred.fun";

function mcpApiUrl(): string {
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalHost) {
    const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    return configured || "http://localhost:8080";
  }

  return DEFAULT_PRODUCTION_MCP_API_URL;
}

function mcpServerConfig() {
  const apiUrl = mcpApiUrl();
  return `{
  "mcpServers": {
    "thred": {
      "command": "npx",
      "args": ["-y", "${MCP_PACKAGE}"],
      "env": {
        "THRED_API_KEY": "thrd_sk_…",
        "THRED_API_URL": "${apiUrl}"
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

/** Outline Thred glyph for small icon buttons (matches key / MCP stroke style). */
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

const ui = {
  primary:
    "landing-cta inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_1px_1px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)] hover:bg-[#363634] hover:shadow-[0_1px_1px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.14)] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "landing-cta inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-[#e2e3df] bg-white px-3 py-2 text-[12px] font-medium text-[#373936] shadow-[0_1px_1px_rgba(0,0,0,0.04)] hover:border-[#d0d2cc] hover:text-[#171717]",
  link: "landing-link inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-[#5f625d] hover:text-[#171717]",
  label: "block text-[11px] font-medium text-[#4e514c]",
  input:
    "mt-1.5 w-full rounded-[6px] border border-[#e2e3df] bg-white px-3 py-2.5 text-[13px] font-normal text-[#252724] outline-none transition placeholder:text-[#a5a8a2] focus:border-[#8f938c] focus:ring-2 focus:ring-[#e8ebe6]",
  code: "rounded-[4px] border border-[#e8e8e4] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#454a43]",
  tile: "grid size-12 place-items-center overflow-hidden rounded-[14px] border border-[#d9ddd8] bg-white text-[#575d58] shadow-[0_5px_12px_rgba(0,0,0,0.06)]",
};

/** Left-aligned, two-tone page title — same voice as the landing hero. */
function PageHeader({
  title,
  accent,
  children,
  actions,
}: {
  title: string;
  accent?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-[#e8e8e4] px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[560px]">
          <h1 className="text-[30px] font-normal leading-[0.98] tracking-[-0.055em] sm:text-[36px]">
            <span className="block text-[#111111]">{title}</span>
            {accent && <span className="block text-[#6b6e69]">{accent}</span>}
          </h1>
          {children && (
            <p className="mt-4 max-w-[480px] text-pretty text-[13px] leading-[1.65] text-[#70726e]">
              {children}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-4">{actions}</div>}
      </div>
    </header>
  );
}

/** Ruled row: label column on the left, content on the right. */
function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-6 gap-5 border-b border-[#e8e8e4] px-6 py-9 last:border-b-0 sm:px-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 className="text-[15px] font-medium tracking-[-0.035em] text-[#252724]">{title}</h2>
        {description && (
          <p className="mt-1.5 text-[12px] leading-5 text-[#747770]">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start rounded-[10px] border border-dashed border-[#dcddd8] px-5 py-6">
      <span className="grid size-9 place-items-center rounded-[9px] border border-[#e2e3df] bg-white text-[#575d58] shadow-[0_3px_8px_rgba(0,0,0,0.05)]">
        {icon}
      </span>
      <p className="mt-4 text-[13px] font-medium text-[#252724]">{title}</p>
      <p className="mt-1 max-w-[420px] text-[12px] leading-5 text-[#747770]">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** The landing page's tool tray: white tiles in a soft grey pill. */
function ToolTray({ items }: { items: Array<{ label: string; node: React.ReactNode }> }) {
  return (
    <div className="flex w-fit items-center gap-2.5 rounded-[20px] border border-white/80 bg-[#e9ece9]/90 p-2.5 shadow-[0_14px_40px_rgba(65,84,72,0.12)]">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <PixelArrowRight className="size-3 text-[#9ba29c]" />}
          <span title={item.label}>{item.node}</span>
        </Fragment>
      ))}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#2c2f2b] bg-[#1d1f1c] shadow-[0_12px_28px_rgba(25,30,26,.1)]">
      <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(children);
            setCopied(true);
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <PixelCheck className="size-3" /> : <PixelCopy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-[#e8ebe6]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

type Checkpoint = Overview["latestCheckpoints"][number];

function HandoffList({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const formatDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return (
    <div className="divide-y divide-[#e8e8e4]">
      {checkpoints.map((checkpoint) => (
        <article key={checkpoint.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#252724]">{checkpoint.task}</p>
            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#747770]">
              {checkpoint.payload?.nextStep ?? "No next step recorded."}
            </p>
          </div>
          <p className="shrink-0 text-right text-[11px] leading-5 text-[#8a8c86]">
            <span className="block capitalize">{checkpoint.session.agent.toLowerCase()}</span>
            {formatDate.format(new Date(checkpoint.updatedAt))}
          </p>
        </article>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  const bar = "animate-pulse rounded bg-[#ebece8]";

  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="min-h-screen bg-[#fcfcfb] text-[#242622]"
    >
      <aside className="fixed top-0 bottom-0 left-0 hidden w-[3.625rem] border-r border-[#e2e5e0] bg-[#f1f2f0] px-2.5 py-3.5 lg:block">
        <div className="mx-auto size-7 animate-pulse rounded-[8px] bg-[#dfe2dd]" />
        <div className="mt-8 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="mx-auto size-[2.375rem] animate-pulse rounded-[9px] bg-[#e5e7e3]" />
          ))}
        </div>
      </aside>
      <section className="min-w-0 lg:ml-[3.625rem]">
        <div className="mx-auto min-h-screen max-w-[880px] border-x border-[#e8e8e4]">
          <div className="space-y-3 border-b border-[#e8e8e4] px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
            <div className={`${bar} h-8 w-[52%]`} />
            <div className={`${bar} h-8 w-[38%]`} />
            <div className={`${bar} mt-5 h-3 w-[46%]`} />
          </div>
          {[0, 1].map((row) => (
            <div key={row} className="grid gap-5 border-b border-[#e8e8e4] px-6 py-9 sm:px-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
              <div className="space-y-2">
                <div className={`${bar} h-3 w-24`} />
                <div className={`${bar} h-2.5 w-36`} />
              </div>
              <div className={`${bar} h-24 w-full`} />
            </div>
          ))}
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
    <>
      <PageHeader
        title="Give your agent"
        accent="access."
        actions={
          <button type="button" onClick={() => void create()} className={ui.primary}>
            <PixelKey className="size-3.5" />
            Create key
          </button>
        }
      >
        One key per agent or environment. The secret is shown only once.
      </PageHeader>
      {revealedKey && (
        <Section title="New key" description="Copy it now. It won't be shown again.">
          <div className="flex items-center gap-2 rounded-[8px] border border-[#e2e3df] bg-white p-1.5 pl-3 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#373a35]">
              {revealedKey}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(revealedKey);
                setCopied(true);
              }}
              className={ui.primary}
            >
              {copied ? <PixelCheck className="size-3" /> : <PixelCopy className="size-3" />}
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
        </Section>
      )}
      <Section
        id="api-keys"
        title="Active keys"
        description={loading ? "Loading…" : `${keys.length} key${keys.length === 1 ? "" : "s"} in this workspace.`}
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-[8px] bg-[#ebece8]" />
            <div className="h-12 animate-pulse rounded-[8px] bg-[#ebece8]" />
          </div>
        ) : keys.length ? (
          <div className="divide-y divide-[#e8e8e4]">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#252724]">{key.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-[#8a8c86]">
                    {key.keyPrefix}••••••••{" "}
                    {key.lastUsedAt
                      ? `· used ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(key.lastUsedAt))}`
                      : "· not used yet"}
                  </p>
                </div>
                {key.revokedAt ? (
                  <span className="text-[11px] text-[#9a9c96]">Revoked</span>
                ) : (
                  <button type="button" onClick={() => void revoke(key)} className={ui.secondary}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PixelKey className="size-4" />}
            title="No keys yet."
            action={
              <button type="button" onClick={() => void create()} className={ui.primary}>
                Create your first key
              </button>
            }
          >
            Create a key, copy it once, then add it to your agent&apos;s MCP configuration.
          </EmptyState>
        )}
      </Section>
    </>
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
    <>
      <PageHeader title="Bring your own" accent="model key.">
        Choose the provider Thred uses for extraction and evaluation. Keys are encrypted before storage and never returned.
      </PageHeader>
      <Section title="Connected" description="Providers saved in this workspace.">
        {credentials.length ? (
          <div className="divide-y divide-[#e8e8e4]">
            {credentials.map((item) => (
              <div key={item.provider} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#252724]">{item.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-[#8a8c86]">
                    {item.model} · {item.keyHint}
                  </p>
                </div>
                <button type="button" onClick={() => void remove(item)} className={ui.secondary}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] leading-5 text-[#8a8c86]">No provider saved yet.</p>
        )}
      </Section>
      <Section
        title="Add a provider"
        description="Ollama runs locally without a key. Groq and OpenRouter often have free models with provider limits."
      >
        <form onSubmit={(event) => void save(event)} className="grid gap-4 sm:grid-cols-2">
          <label className={ui.label}>
            Provider
            <select value={provider} onChange={(event) => changeProvider(event.target.value)} className={ui.input}>
              {providerOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} required className={ui.input} placeholder="Model ID" />
          </label>
          <label className={ui.label}>
            Base URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} required={provider === "custom"} className={ui.input} placeholder="https://api.example.com/v1" />
          </label>
          <label className={ui.label}>
            Label
            <input value={label} onChange={(event) => setLabel(event.target.value)} className={ui.input} />
          </label>
          {selected.needsKey && (
            <label className={`${ui.label} sm:col-span-2`}>
              Provider API key
              <input
                type="password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                required={!credentials.some((item) => item.provider === provider)}
                className={ui.input}
                placeholder={credentials.some((item) => item.provider === provider) ? "Leave blank to keep current key" : "Paste provider key"}
              />
            </label>
          )}
          <div className="flex items-center gap-4 sm:col-span-2">
            <button disabled={saving} className={ui.primary}>
              {saving ? "Saving…" : "Save provider"}
            </button>
            {message && (
              <p className={`text-[12px] ${message.includes("securely") ? "text-[#477152]" : "text-red-600"}`}>{message}</p>
            )}
          </div>
        </form>
      </Section>
    </>
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
      prompt: `Connect to Thred for the ${workspace.name} workspace using the THRED_API_KEY I provide. Before starting work, retrieve the current workspace context. Before you finish or hand work off, call thread_checkpoint with the goal, progress, decisions, evidence, blockers, and exact next step. Configure model credentials separately under BYOK providers.`,
    },
    {
      name: "Cursor",
      icon: "cursor",
      prompt: `Connect to Thred for ${workspace.name} using my THRED_API_KEY. Read the workspace context before making changes. When the work is ready to hand off, save a thread_checkpoint with the changed files, decisions, evidence, blockers, and next step so the next agent can continue immediately. The model provider is configured separately with BYOK.`,
    },
    {
      name: "Codex",
      icon: "codex",
      prompt: `Use Thred as the shared memory for ${workspace.name}. Configure it with the THRED_API_KEY I provide, then retrieve the current context before you begin. At each meaningful handoff, call thread_checkpoint with a concise summary, decisions, verification, open risks, and next action. Provider credentials are configured separately under BYOK.`,
    },
  ];

  return (
    <>
      <PageHeader title="Start every agent" accent="with context.">
        Pick your tool, copy its instructions, and the agent picks up the work with the context it needs.
      </PageHeader>
      {prompts.map((item) => (
        <Section
          key={item.name}
          title={
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[#d9ddd8] bg-white text-[#3c403b] shadow-[0_3px_8px_rgba(0,0,0,0.05)]">
                {item.icon === "claude" ? (
                  <SiClaude className="size-3.5" />
                ) : item.icon === "cursor" ? (
                  <SiCursor className="size-3.5" />
                ) : (
                  <CodexMark />
                )}
              </span>
              {item.name}
            </span>
          }
          description="Paste into project instructions or the first message."
        >
          <div className="rounded-[10px] border border-[#e8e8e4] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
            <p className="text-[13px] leading-6 text-[#4e514c]">{item.prompt}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(item.prompt);
                  setCopied(item.name);
                }}
                className={ui.secondary}
              >
                {copied === item.name ? <PixelCheck className="size-3" /> : <PixelCopy className="size-3" />}
                {copied === item.name ? "Copied" : "Copy instructions"}
              </button>
            </div>
          </div>
        </Section>
      ))}
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
  const config = mcpServerConfig();
  const prompt = `Before you begin, retrieve the current Thred context. When work is ready to pass on, call thread_checkpoint with the task, decisions, evidence, blockers, and exact next step.`;
  const DocSection = ({
    id,
    number,
    title,
    children,
  }: {
    id: string;
    number: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <section id={id} className="scroll-mt-6 border-b border-[#e8e8e4] px-6 py-10 last:border-b-0 sm:px-10">
      <p className="font-mono text-[11px] text-[#9a9c96]">{number}</p>
      <h2 className="mt-2 text-balance text-[22px] font-medium leading-[1.12] tracking-[-0.045em] text-[#252724]">
        {title}
      </h2>
      {children}
    </section>
  );
  const body = "mt-3 max-w-[560px] text-[13px] leading-6 text-[#70766f]";

  return (
    <>
      <PageHeader title="Bring context into" accent="every handoff.">
        Everything your agents need to save useful work and let the next one resume it.
      </PageHeader>
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#e8e8e4] lg:block">
          <nav className="sticky top-0 space-y-0.5 px-6 py-10">
            {docsNav.map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                className="landing-link flex items-baseline gap-2.5 py-1 text-[12px] text-[#6b6e69] hover:text-[#171717]"
              >
                <span className="font-mono text-[10px] text-[#a3a59f]">0{index + 1}</span>
                {label}
              </a>
            ))}
          </nav>
        </aside>
        <article className="min-w-0">
          <DocSection id="quickstart" number="01" title="Connect an agent in three moves.">
            <ol className="mt-6 divide-y divide-[#e8e8e4]">
              {["Create a Thred agent key", "Add the MCP config", "Save your first handoff"].map((item, index) => (
                <li key={item} className="flex items-baseline gap-4 py-3.5 text-[13px] text-[#252724] first:pt-0 last:pb-0">
                  <span className="font-mono text-[11px] text-[#9a9c96]">0{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </DocSection>
          <DocSection id="codebase" number="02" title="Add Thred to the agent you already use.">
            <p className={body}>
              Paste this into your MCP client configuration, then add the Thred agent key from this workspace. Provider keys are configured separately under BYOK providers.
            </p>
            <div className="mt-6">
              <ToolTray
                items={[
                  { label: "Claude", node: <span className="grid size-12 place-items-center rounded-[14px] border border-[#c9694a] bg-[#D87551] text-[#FFF7F1] shadow-[0_5px_12px_rgba(0,0,0,0.08)]"><SiClaude className="size-5" /></span> },
                  { label: "Thred", node: <span className="grid size-12 place-items-center rounded-[14px] bg-[#1c211e] shadow-[0_5px_12px_rgba(0,0,0,0.12)]"><Mark className="size-7" /></span> },
                  { label: "Codex", node: <span className={ui.tile}><CodexMark /></span> },
                ]}
              />
            </div>
            <div className="mt-6">
              <CodeBlock>{config}</CodeBlock>
            </div>
          </DocSection>
          <DocSection id="providers" number="03" title="Bring your own model key.">
            <p className={body}>
              Configure the model key Thred should use for extraction and evaluation. Keys are encrypted before storage and never returned. Ollama runs locally without a key; Groq and OpenRouter often have free models with provider limits.
            </p>
            <div className="mt-6">
              <CodeBlock>{`Provider: Groq (free tier)
Model: openai/gpt-oss-20b
Base URL: https://api.groq.com/openai/v1
Label: Groq (free tier)
API key: Paste provider key`}</CodeBlock>
            </div>
          </DocSection>
          <DocSection id="prompt" number="04" title="Tell the agent when memory matters.">
            <p className={body}>
              Put this in your project instructions or first message. It gives every agent the same handoff discipline.
            </p>
            <div className="mt-6">
              <CodeBlock>{prompt}</CodeBlock>
            </div>
          </DocSection>
          <DocSection id="save" number="05" title="Checkpoint work before the context disappears.">
            <p className={body}>
              When an agent finishes a meaningful step, it saves the facts the next agent cannot safely guess.
            </p>
            <div className="mt-6">
              <CodeBlock>{`thread_checkpoint({
  sessionId: "oauth-onboarding",
  messages: [
    { id: "m1", role: "user", content: "Use Google-only sign in." },
    { id: "m2", role: "assistant", content: "Done. Next: add the production redirect URL." }
  ],
  changedFiles: ["app/sign-in/page.tsx"],
  testResults: ["OAuth callback tested locally"]
})`}</CodeBlock>
            </div>
          </DocSection>
          <DocSection id="resume" number="06" title="Pick up exactly where work stopped.">
            <p className={body}>
              A new agent reads the saved context first, then continues with the task, decisions, evidence, and next step already in view.
            </p>
            <div className="mt-6 overflow-hidden rounded-[10px] border border-[#2c2f2b] bg-[#1d1f1c] p-5 font-mono text-[12px] leading-6 text-[#dce1da] shadow-[0_12px_28px_rgba(25,30,26,.1)]">
              <p className="text-[#99a997]">$ codex</p>
              <p className="mt-2 text-white">› thread_resume for {workspace.name}</p>
              <p className="text-[#a8b4a5]">✓ 1 open handoff · next step loaded</p>
              <p className="mt-2 text-white">› Continue from the saved checkpoint</p>
            </div>
          </DocSection>
          <DocSection id="reference" number="07" title="The small toolset behind the handoff.">
            <div className="mt-6 divide-y divide-[#e8e8e4]">
              {[
                ["thread_checkpoint", "Save a resumable task, decisions, evidence, and next step."],
                ["thread_context", "Retrieve current decisions and evidence. Pass includeHistory to see how a fact changed."],
                ["thread_resume", "Pick up the latest unfinished handoff with its related context."],
              ].map(([tool, description]) => (
                <div key={tool} className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
                  <code className="font-mono text-[12px] font-medium text-[#252724]">{tool}</code>
                  <p className="text-[12px] leading-5 text-[#70766f]">{description}</p>
                </div>
              ))}
            </div>
          </DocSection>
        </article>
      </div>
    </>
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
  const [sidebarWorkspaceOpen, setSidebarWorkspaceOpen] = useState(false);
  const [settingsWorkspaceOpen, setSettingsWorkspaceOpen] = useState(false);
  const sidebarWorkspaceRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const settingsWorkspaceRef = useRef<HTMLDivElement>(null);
  const [overview, setOverview] = useState<Overview | null>(isHeroPreview ? heroPreviewOverview : null);
  const [view, setView] = useState<View>(initialView);
  const [loading, setLoading] = useState(!isHeroPreview);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
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
    setSidebarWorkspaceOpen(false);
    setSettingsWorkspaceOpen(false);
    setAccountMenuOpen(false);
  }, [view]);

  const closeMenus = () => {
    setSidebarWorkspaceOpen(false);
    setSettingsWorkspaceOpen(false);
    setAccountMenuOpen(false);
  };

  useClickOutside(sidebarWorkspaceRef, () => setSidebarWorkspaceOpen(false), sidebarWorkspaceOpen);
  useClickOutside(accountMenuRef, () => setAccountMenuOpen(false), accountMenuOpen);
  useClickOutside(settingsWorkspaceRef, () => setSettingsWorkspaceOpen(false), settingsWorkspaceOpen);

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
    <main
      data-hero-preview={isHeroPreview ? "true" : undefined}
      className={`${isHeroPreview ? "grid h-[1100px] min-h-0 grid-cols-[18rem_minmax(0,1fr)] overflow-hidden" : "min-h-screen"} bg-[#f1f2f0] text-[#242622]`}
    >
      {!isHeroPreview && <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className={`fixed inset-0 z-40 bg-[#172018]/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />}
      <DashboardSidebar
        isHeroPreview={isHeroPreview}
        mobileNavOpen={mobileNavOpen}
        onMobileNavClose={() => setMobileNavOpen(false)}
        view={view}
        onViewChange={setView}
        workspace={workspace}
        workspaces={workspaces}
        onWorkspaceChange={setWorkspace}
        accountName={accountName}
        sidebarWorkspaceOpen={sidebarWorkspaceOpen}
        setSidebarWorkspaceOpen={setSidebarWorkspaceOpen}
        sidebarWorkspaceRef={sidebarWorkspaceRef}
        accountMenuOpen={accountMenuOpen}
        setAccountMenuOpen={setAccountMenuOpen}
        accountMenuRef={accountMenuRef}
        onSignOut={async () => {
          await signOut();
          router.replace("/");
        }}
      />
      <section className={`min-w-0 bg-[#fcfcfb] ${isHeroPreview ? "" : "lg:ml-[3.625rem]"}`}>
        {!isHeroPreview && (
          <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-[#eceeea] bg-white/90 px-4 backdrop-blur sm:px-5 lg:hidden">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="grid size-8 cursor-pointer place-items-center rounded-[7px] text-[#4d534c] transition hover:bg-[#eef0ec]">
              <PixelMenu className="size-4" />
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-[14px] font-semibold tracking-[-.055em]">
              <Mark className="size-5" />
              thred
            </Link>
          </div>
        )}
        <div className={`bg-[#fcfcfb] ${isHeroPreview ? "min-h-[1100px]" : "min-h-screen"}`}>
          <div
            className={`mx-auto border-x border-[#e8e8e4] ${view === "docs" ? "max-w-[1080px]" : "max-w-[880px]"} ${isHeroPreview ? "min-h-[1100px]" : "min-h-screen"}`}
          >
            {view === "overview" && (
              <>
                <PageHeader
                  title={`${salutation}, ${firstName}.`}
                  accent="Your work, carried forward."
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        closeMenus();
                        if (overview?.metrics.agentCount) {
                          setView("apiKeys");
                        } else {
                          setSetupOpen(true);
                        }
                      }}
                      className={ui.primary}
                    >
                      {overview?.metrics.agentCount ? "Manage agent keys" : "Get started"}
                      <PixelArrowRight className="size-3" />
                    </button>
                  }
                >
                  Thred keeps every agent in this workspace oriented around the work in motion.
                </PageHeader>
                <Section
                  title="Shared context"
                  description="Your agent saves the state once. The next one resumes with the decisions, evidence, and next step."
                >
                  <ToolTray
                    items={[
                      { label: "Claude", node: <span className="grid size-12 place-items-center rounded-[14px] border border-[#c9694a] bg-[#D87551] text-[#FFF7F1] shadow-[0_5px_12px_rgba(0,0,0,0.08)]"><SiClaude className="size-5" /></span> },
                      { label: "Thred", node: <span className="grid size-12 place-items-center rounded-[14px] bg-[#1c211e] shadow-[0_5px_12px_rgba(0,0,0,0.12)]"><Mark className="size-7" /></span> },
                      { label: "HydraDB memory", node: <span className={ui.tile}><HydraMark /></span> },
                      { label: "Codex", node: <span className={ui.tile}><CodexMark /></span> },
                    ]}
                  />
                </Section>
                <Section title="Activity" description="Live counts for this workspace.">
                  <dl className="grid grid-cols-2 divide-x divide-[#e8e8e4]">
                    {[
                      ["Agent sessions", overview?.metrics.agentCount ?? 0],
                      ["Saved handoffs", overview?.metrics.checkpointCount ?? 0],
                    ].map(([label, value], index) => (
                      <div key={label as string} className={`py-1 ${index === 0 ? "pr-5" : "pl-5"}`}>
                        <dd className="text-[30px] font-normal leading-none tracking-[-0.055em] text-[#111111]">{value}</dd>
                        <dt className="mt-2 text-[11px] text-[#8a8c86]">{label}</dt>
                      </div>
                    ))}
                  </dl>
                </Section>
                <Section title="Get set up" description="Three steps to your first handoff.">
                  <ol className="divide-y divide-[#e8e8e4]">
                    {([
                      ["Create a Thred agent key", "apiKeys"],
                      ["Add Thred to your agent", "mcp"],
                      ["Copy the agent instructions", "prompts"],
                    ] as const).map(([label, target], index) => (
                      <li key={target} className="group/step">
                        <button
                          type="button"
                          onClick={() => setView(target)}
                          className="group flex w-full cursor-pointer items-center gap-4 py-3.5 text-left text-[13px] text-[#252724] group-first/step:pt-0 group-last/step:pb-0"
                        >
                          <span className="font-mono text-[11px] text-[#9a9c96]">0{index + 1}</span>
                          <span className="flex-1">{label}</span>
                          <PixelArrowRight className="size-3 text-[#a3a59f] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#171717]" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </Section>
                {overview?.latestCheckpoints.length ? (
                  <Section title="Latest handoffs" description="The most recent checkpoints your agents saved.">
                    <HandoffList checkpoints={overview.latestCheckpoints} />
                  </Section>
                ) : null}
              </>
            )}
            {view === "mcp" && (
              <>
                <PageHeader title="Bring Thred" accent="into your agent.">
                  Create a Thred agent key, then add this configuration to Codex, Claude, or Cursor. Your model provider is configured separately under BYOK providers.
                </PageHeader>
                <Section title="Create a key" description="Each agent or environment gets its own key.">
                  <button type="button" onClick={() => setView("apiKeys")} className={ui.secondary}>
                    <PixelKey className="size-3.5" />
                    Open agent keys
                  </button>
                </Section>
                <Section title="Add the config" description="Paste this into your MCP client configuration.">
                  <CodeBlock>{mcpServerConfig()}</CodeBlock>
                  <p className="mt-4 text-[12px] leading-5 text-[#747770]">
                    Replace <code className={ui.code}>thrd_sk_…</code> with your Thred agent key. The MCP server calls{" "}
                    <code className={ui.code}>THRED_API_URL</code>, so keep both env vars set for the tools to work.
                  </p>
                </Section>
                <Section title="Save a handoff" description="Your agent checkpoints the work for the next one.">
                  <p className="text-[13px] leading-6 text-[#4e514c]">
                    Ask your agent to call <code className={ui.code}>thread_checkpoint</code> after a meaningful step. The next agent resumes from it.
                  </p>
                  <button type="button" onClick={() => setView("prompts")} className={`${ui.link} mt-3`}>
                    Copy agent instructions <PixelArrowRight className="size-3" />
                  </button>
                </Section>
              </>
            )}
            {view === "apiKeys" && <ApiKeys workspace={workspace} request={request} />}
            {view === "prompts" && <AgentPrompts workspace={workspace} />}
            {view === "docs" && <DocsPage workspace={workspace} />}
            {view === "settings" && (
              <>
                <PageHeader title="Make this space" accent="yours.">
                  Name the place your agents use to share context, checkpoints, and durable memory.
                </PageHeader>
                <Section
                  title="Workspace name"
                  description="Every key, checkpoint, and memory stays scoped to this workspace. Rename it anytime."
                >
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveWorkspaceSettings();
                    }}
                  >
                    <label className={ui.label}>
                      Name
                      <input
                        value={settingsName}
                        onChange={(event) => {
                          setSettingsName(event.target.value);
                          setSettingsMessage(null);
                        }}
                        className={ui.input}
                      />
                    </label>
                    <div className="mt-4 flex items-center gap-4">
                      <button disabled={savingSettings} className={ui.primary}>
                        {savingSettings ? "Saving…" : "Save changes"}
                      </button>
                      {settingsMessage && (
                        <p className={`text-[12px] ${settingsMessage === "Saved." ? "text-[#477152]" : "text-red-600"}`}>
                          {settingsMessage}
                        </p>
                      )}
                    </div>
                  </form>
                </Section>
                <Section title="Workspaces" description="Switch between workspaces or start a new one.">
                  <div ref={settingsWorkspaceRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarWorkspaceOpen(false);
                        setAccountMenuOpen(false);
                        setSettingsWorkspaceOpen((open) => !open);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] border border-[#e2e3df] bg-white px-3 py-2.5 text-left text-[13px] text-[#252724] shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition hover:border-[#d0d2cc]"
                      aria-expanded={settingsWorkspaceOpen}
                      aria-haspopup="menu"
                    >
                      <PixelFolder className="size-3.5 text-[#777d75]" />
                      <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                      <PixelChevronDown
                        className={`size-3.5 text-[#777b74] transition-transform duration-200 ${settingsWorkspaceOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {settingsWorkspaceOpen && (
                      <div
                        role="menu"
                        className="ui-popover ui-popover-down absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[9px] border border-[#e8e8e4] bg-white p-1.5 shadow-[0_12px_28px_rgba(29,40,31,.13)]"
                      >
                        {workspaces.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setWorkspace(item);
                              setSettingsWorkspaceOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center rounded-[6px] px-2.5 py-2 text-left text-[12px] transition-colors ${item.id === workspace.id ? "bg-[#f1f2f0] font-medium text-[#171717]" : "text-[#62665f] hover:bg-[#f5f6f3]"}`}
                          >
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            {item.id === workspace.id && <PixelCheck className="size-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      setWorkspaceError(null);
                      setNewWorkspaceOpen(true);
                    }}
                    className={`${ui.link} mt-4`}
                  >
                    New workspace <PixelArrowRight className="size-3" />
                  </button>
                </Section>
              </>
            )}
            {view === "providers" && <ProviderKeys workspace={workspace} request={request} />}
          </div>
        </div>
      </section>
      {setupOpen && (
        <div 
          onClick={() => setSetupOpen(false)}
          className="ui-overlay fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/20 p-5 backdrop-blur-[5px]"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="ui-modal-panel w-full max-w-[480px] cursor-default overflow-hidden rounded-[22px] bg-white shadow-[0_28px_90px_rgba(24,32,26,.22)]"
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
          className="ui-overlay fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/25 p-5 backdrop-blur-[5px]"
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void createWorkspace();
            }}
            className="ui-modal-panel w-full max-w-[560px] cursor-default overflow-hidden rounded-[24px] border border-white/70 bg-[#fcfcfb] shadow-[0_28px_90px_rgba(24,32,26,.22)]"
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

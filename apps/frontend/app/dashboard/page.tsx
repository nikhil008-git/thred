"use client";

import { Fragment, Suspense, useEffect, useId, useRef, useState } from "react";
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
  PixelTrash,
  PixelMenu,
} from "@/components/pixel-icons";
import { signOut, useSession } from "@/lib/auth-client";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useClickOutside } from "@/lib/use-click-outside";
import { toast } from "@/components/ui/toast";

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
type AgentSession = {
  id: string;
  agent: string;
  startedAt: string;
  endedAt: string | null;
};
type Checkpoint = {
  id: string;
  task: string;
  status: string;
  updatedAt: string;
  payload: { nextStep?: string };
  session: { agent: string };
};
type Overview = {
  metrics: { agentCount: number; checkpointCount: number };
  latestSessions: AgentSession[];
  latestCheckpoints: Checkpoint[];
};

const setupSteps: { label: string; target: View }[] = [
  { label: "Create a Thred agent key", target: "apiKeys" },
  { label: "Add Thred to your agent", target: "mcp" },
  { label: "Copy the agent instructions", target: "prompts" },
];

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
  // Unique per instance: a gradient inside a hidden copy can't paint visible ones.
  const gradientId = useId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
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
      <rect width="28" height="28" rx="8.5" fill={`url(#${gradientId})`} />
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
        className="absolute left-[8.4%] top-[10%] h-8 max-w-none w-auto"
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
    "landing-cta inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] btn-ink px-4 py-2.5 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "landing-cta inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] btn-paper px-3 py-2 text-[12px] font-medium",
  link: "landing-link inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-[#5f625d] hover:text-[#171717]",
  label: "block text-[11px] font-medium text-[#4e514c]",
  input:
    "bevel-input mt-1.5 w-full rounded-[6px] px-3 py-2.5 text-[13px] font-normal text-[#252724] placeholder:text-[#a5a8a2]",
  code: "rounded-[4px] border border-[#e8e8e4] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#454a43]",
  tile: "bevel-tile grid size-12 place-items-center overflow-hidden rounded-[14px] text-[#575d58]",
};

/** Left-aligned, two-tone page title, same voice as the landing hero. */
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
    <header className="rule-fade frame-marks frame-marks-sm border-b px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
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
      className="grid scroll-mt-6 gap-5 rule-fade frame-marks frame-marks-sm border-b px-6 py-9 last:border-b-0 sm:px-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10"
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
    <div className="flex flex-col items-start rounded-[10px] border border-dotted border-[#b9bcb5] px-5 py-6">
      <span className="bevel-tile grid size-9 place-items-center rounded-[9px] text-[#575d58]">
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
    <div className="flex w-fit items-center gap-2.5 bevel-tray rounded-[20px] p-2.5">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <PixelArrowRight className="size-3 text-[#9ba29c]" />}
          <span title={item.label}>{item.node}</span>
        </Fragment>
      ))}
    </div>
  );
}

function CodeBlock({ children, filename, wrap = false }: { children: string; filename?: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <div className="bevel-code overflow-hidden rounded-[10px]">
      <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-2">
        {filename ? (
          <span className="font-mono text-[11px] text-white/45">{filename}</span>
        ) : (
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </div>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            toast("Copied to clipboard");
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <PixelCheck className="size-3" /> : <PixelCopy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={`p-5 font-mono text-[12px] leading-6 text-[#e8ebe6] ${wrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto"}`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

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
  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="flex min-h-screen bg-[#fcfcfb]"
    >
      <aside className="hidden w-[3.625rem] shrink-0 flex-col items-center gap-3 border-r border-[#e2e5e0] bg-[#f1f2f0] pt-4 lg:flex">
        <span className="skeleton size-8 rounded-[9px]" />
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} className="skeleton mt-1 size-6 rounded-[7px]" />
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="page-frame mx-auto min-h-screen max-w-[880px] sm:border-x">
          <div className="rule-fade frame-marks frame-marks-sm border-b px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
            <span className="skeleton block h-8 w-[min(340px,80%)]" />
            <span className="skeleton mt-3 block h-8 w-[min(260px,60%)]" />
            <span className="skeleton mt-6 block h-3 w-[min(420px,90%)]" />
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} className="rule-fade frame-marks frame-marks-sm grid gap-5 border-b px-6 py-9 last:border-b-0 sm:px-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
              <div>
                <span className="skeleton block h-3.5 w-28" />
                <span className="skeleton mt-3 block h-2.5 w-40" />
              </div>
              <span className="skeleton block h-16 w-full rounded-[10px]" />
            </div>
          ))}
        </div>
      </div>
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmingId) return;
    const timer = window.setTimeout(() => setConfirmingId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmingId]);

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
    if (!response.ok) {
      toast("Couldn’t create a key.", "error");
      return;
    }
    const result = (await response.json()) as {
      apiKey: ApiKey;
      secret: string;
    };
    setKeys((current) => [result.apiKey, ...current]);
    setRevealedKey(result.secret);
    setCopied(false);
    toast("Key created. Copy it now.");
  };
  const revoke = async (key: ApiKey) => {
    const response = await request(
      `/api/workspaces/${workspace.slug}/api-keys/${key.id}/revoke`,
      { method: "POST" },
    );
    if (response.ok) {
      setKeys((current) => current.filter((item) => item.id !== key.id));
      toast(`Revoked ${key.name}`);
    } else toast("Couldn’t revoke that key.", "error");
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
                toast("Key copied");
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
        description={loading ? undefined : `${keys.length} key${keys.length === 1 ? "" : "s"} in this workspace.`}
      >
        {loading ? (
          <div aria-busy="true" aria-label="Loading keys" className="divide-y divide-[#e8e8e4]">
            {[0, 1].map((item) => (
              <div key={item} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <span className="skeleton block h-3 w-32" />
                  <span className="skeleton mt-2 block h-2.5 w-48" />
                </div>
                <span className="skeleton block size-8" />
              </div>
            ))}
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
                <button
                  type="button"
                  onClick={() => {
                    if (confirmingId === key.id) {
                      setConfirmingId(null);
                      void revoke(key);
                    } else {
                      setConfirmingId(key.id);
                    }
                  }}
                  aria-label={confirmingId === key.id ? `Confirm delete ${key.name}` : `Delete ${key.name}`}
                  title={confirmingId === key.id ? "Click again to delete" : "Delete key"}
                  className={`landing-cta inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                    confirmingId === key.id
                      ? "btn-danger px-2.5"
                      : "w-8 text-[#8a8c86] hover:bg-[#f4e9e7] hover:text-[#b4473b]"
                  }`}
                >
                  <PixelTrash className="size-3.5" />
                  {confirmingId === key.id && "Delete?"}
                </button>
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

type ProviderOption = {
  id: string;
  label: string;
  model: string;
  baseUrl: string;
  needsKey: boolean;
};

const providerOptions: ProviderOption[] = [
  { id: "openai", label: "OpenAI", model: "gpt-5-mini", baseUrl: "https://api.openai.com/v1", needsKey: true },
  { id: "groq", label: "Groq (free tier)", model: "openai/gpt-oss-20b", baseUrl: "https://api.groq.com/openai/v1", needsKey: true },
  { id: "xai", label: "xAI / Grok", model: "grok-4-1-fast-reasoning", baseUrl: "https://api.x.ai/v1", needsKey: true },
  { id: "openrouter", label: "OpenRouter", model: "openai/gpt-oss-20b:free", baseUrl: "https://openrouter.ai/api/v1", needsKey: true },
  { id: "ollama", label: "Ollama (local, no key)", model: "llama3.2", baseUrl: "http://localhost:11434/v1", needsKey: false },
  { id: "custom", label: "Custom OpenAI-compatible", model: "", baseUrl: "", needsKey: true },
];

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
  const [model, setModel] = useState(selected.model);
  const [baseUrl, setBaseUrl] = useState(selected.baseUrl);
  const [label, setLabel] = useState(selected.label);
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
    if (response.ok && result.provider) { setCredentials((current) => [result.provider!, ...current.filter((item) => item.provider !== provider)]); setKey(""); setMessage(null); toast("Provider saved securely"); }
    else setMessage(result.error ?? "Could not save provider.");
    setSaving(false);
  };
  const remove = async (item: ProviderCredential) => {
    const response = await request(`/api/workspaces/${workspace.slug}/providers?provider=${encodeURIComponent(item.provider)}`, { method: "DELETE" });
    if (response.ok) {
      setCredentials((current) => current.filter((entry) => entry.provider !== item.provider));
      toast("Provider removed");
    } else toast("Couldn’t remove that provider.", "error");
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
                  toast("Instructions copied");
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

type DocsClient = {
  id: string;
  label: string;
  filename: string;
  config: () => string;
};

const docsClients: DocsClient[] = [
  {
    id: "claude",
    label: "Claude Code",
    filename: ".mcp.json",
    config: () => mcpServerConfig(),
  },
  {
    id: "cursor",
    label: "Cursor",
    filename: ".cursor/mcp.json",
    config: () => mcpServerConfig(),
  },
  {
    id: "codex",
    label: "Codex",
    filename: "~/.codex/config.toml",
    config: () => `[mcp_servers.thred]
command = "npx"
args = ["-y", "${MCP_PACKAGE}"]

[mcp_servers.thred.env]
THRED_API_KEY = "thrd_sk_…"
THRED_API_URL = "${mcpApiUrl()}"`,
  },
];

// [tool name, what it does]
const docsTools: [string, string][] = [
  ["thread_context", "Retrieve project context. Pass includeHistory to see how a fact changed."],
  ["thread_checkpoint", "Save progress, decisions, and the next step."],
  ["thread_resume", "Pick up the latest unfinished handoff."],
];

function DocsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [client, setClient] = useState("claude");
  const selectedClient = docsClients.find((item) => item.id === client) ?? docsClients[0];
  const prompt = `Before you begin, retrieve the current Thred context with thread_context. When work is ready to pass on, call thread_checkpoint with the task, decisions, evidence, blockers, and exact next step.`;
  const heading = "text-[15px] font-medium tracking-[-0.03em] text-[#252724]";
  const body = "mt-2 text-[13px] leading-6 text-[#70726e]";

  return (
    <>
      <div className="mx-auto max-w-[640px] space-y-14 px-6 py-16 sm:px-10">
        <header>
          <h1 className="text-[30px] font-normal leading-[0.98] tracking-[-0.055em] text-[#111111] sm:text-[36px]">Docs.</h1>
          <p className="mt-3 text-[13px] leading-[1.65] text-[#70726e]">Set up Thred in a few minutes.</p>
        </header>
        <section>
          <h2 className={heading}>Setup</h2>
          <ol className="mt-3 space-y-2 text-[13px] leading-6 text-[#4e514c]">
            <li>
              1.{" "}
              <button type="button" onClick={() => onNavigate("apiKeys")} className="landing-link cursor-pointer underline decoration-[#d0d2cc] underline-offset-4 hover:decoration-[#171717]">
                Create an agent key
              </button>
            </li>
            <li>2. Add the config below to your client</li>
            <li>
              3.{" "}
              <button type="button" onClick={() => onNavigate("prompts")} className="landing-link cursor-pointer underline decoration-[#d0d2cc] underline-offset-4 hover:decoration-[#171717]">
                Give your agent the instructions
              </button>
            </li>
          </ol>
        </section>

        <section>
          <h2 className={heading}>Install</h2>
          <p className={body}>
            Paste into <code className="font-mono text-[12px] text-[#252724]">{selectedClient.filename}</code> and replace{" "}
            <code className="font-mono text-[12px] text-[#252724]">thrd_sk_…</code> with your key.
          </p>
          <div className="mt-4 flex gap-4" role="tablist" aria-label="MCP client">
            {docsClients.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={client === item.id}
                onClick={() => setClient(item.id)}
                className={`cursor-pointer text-[12px] transition-colors ${client === item.id ? "font-medium text-[#171717]" : "text-[#9a9c96] hover:text-[#171717]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <CodeBlock filename={selectedClient.filename}>{selectedClient.config()}</CodeBlock>
          </div>
        </section>

        <section>
          <h2 className={heading}>Instructions</h2>
          <p className={body}>Add this to your project instructions.</p>
          <div className="mt-4">
            <CodeBlock wrap>{prompt}</CodeBlock>
          </div>
        </section>

        <section>
          <h2 className={heading}>Tools</h2>
          <dl className="mt-3 space-y-3">
            {docsTools.map(([name, description]) => (
              <div key={name}>
                <dt className="font-mono text-[12px] text-[#252724]">{name}</dt>
                <dd className="mt-0.5 text-[13px] leading-6 text-[#70726e]">{description}</dd>
              </div>
            ))}
          </dl>
        </section>
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
  // Hide data-dependent UI until the overview arrives, so it never flips from a default.
  const [overviewLoaded, setOverviewLoaded] = useState(isHeroPreview);
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
    setOverviewLoaded(false);
    void (async () => {
      const response = await request(
        `/api/workspaces/${workspace.slug}/overview`,
      );
      if (response.ok) setOverview((await response.json()) as Overview);
      else setOverview(null);
      setOverviewLoaded(true);
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
    toast(`Created ${created.name}`);
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
    setSettingsMessage(null);
    toast("Settings saved");
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
        accountEmail={session?.user?.name ? session.user.email : undefined}
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
          <div className="sticky top-0 z-10">
            <div role="status" className="flex items-center justify-center gap-2 border-b border-[#ecdcb0] bg-[#fbf3dc] px-4 py-2 text-center text-[12.5px] leading-snug text-[#6b5313]">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#d4a017]" />
              <span>
                HydraDB has moved API key usage to its paid plans — it&apos;s no longer included in the free tier.
              </span>
            </div>
            <div className="flex h-12 items-center gap-2 border-b border-[#eceeea] bg-white/90 px-4 backdrop-blur sm:px-5 lg:hidden">
              <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="grid size-8 cursor-pointer place-items-center rounded-[7px] text-[#4d534c] transition hover:bg-[#eef0ec]">
                <PixelMenu className="size-4" />
              </button>
              <Link href="/" className="flex items-center gap-1.5 text-[14px] font-semibold tracking-[-.055em]">
                <Mark className="size-5" />
                thred
              </Link>
            </div>
          </div>
        )}
        <div className={`bg-[#fcfcfb] ${isHeroPreview ? "min-h-[1100px]" : "min-h-screen"}`}>
          <div
            className={`page-frame mx-auto sm:border-x max-w-[880px] ${isHeroPreview ? "min-h-[1100px]" : "min-h-screen"}`}
          >
            {view === "overview" && (
              <>
                <PageHeader
                  title={`${salutation}, ${firstName}.`}
                  accent="Your work, carried forward."
                  actions={
                    !overviewLoaded ? (
                      <span aria-label="Loading" className="skeleton block h-[38px] w-[138px] rounded-[5px]" />
                    ) : (
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
                      className={`${ui.primary} ui-enter [animation-duration:250ms]`}
                    >
                      {overview?.metrics.agentCount ? "Manage agent keys" : "Get started"}
                      <PixelArrowRight className="size-3" />
                    </button>
                    )
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
                      { label: "Claude", node: <span className="bevel-tile-clay grid size-12 place-items-center rounded-[14px]"><SiClaude className="size-5" /></span> },
                      { label: "Thred", node: <span className="bevel-tile-ink grid size-12 place-items-center rounded-[14px]"><Mark className="size-7" /></span> },
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
                        <dd className="text-[30px] font-normal leading-none tracking-[-0.055em] text-[#111111]">{overviewLoaded ? <span className="ui-enter inline-block [animation-duration:250ms]">{value}</span> : <span aria-label="Loading" className="skeleton inline-block h-[30px] w-10 align-top" />}</dd>
                        <dt className="mt-2 text-[11px] text-[#8a8c86]">{label}</dt>
                      </div>
                    ))}
                  </dl>
                </Section>
                <Section title="Get set up" description="Three steps to your first handoff.">
                  <ol className="divide-y divide-[#e8e8e4]">
                    {setupSteps.map(({ label, target }, index) => (
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
            {view === "docs" && <DocsPage onNavigate={setView} />}
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
                        className={`size-3.5 text-[#777b74] transition-transform duration-100 ${settingsWorkspaceOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {settingsWorkspaceOpen && (
                      <div
                        role="menu"
                        className="ui-popover ui-popover-down absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[10px] border border-[#e8e8e4] bg-[#fcfcfb] p-1 shadow-[0_1px_1px_rgba(0,0,0,0.04),0_12px_32px_rgba(16,22,18,0.1)]"
                      >
                        {workspaces.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setWorkspace(item);
                              setSettingsWorkspaceOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-[#f1f2f0] hover:text-[#171717] ${item.id === workspace.id ? "text-[#171717]" : "text-[#4e514c]"}`}
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
            className="ui-modal-panel bevel-panel w-full max-w-[480px] cursor-default overflow-hidden rounded-[22px] bg-white"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_20%,rgba(187,234,224,.8),transparent_38%),radial-gradient(circle_at_84%_74%,rgba(203,219,126,.62),transparent_42%),linear-gradient(135deg,#c6e4d3,#9cc98e)] px-7 py-8">
              <div className="pointer-events-none absolute inset-0 opacity-[.13] [background-image:linear-gradient(90deg,rgba(255,255,255,.85)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.85)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="bevel-tile-ink mx-auto grid size-14 place-items-center rounded-[18px]">
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
                  className="landing-cta btn-ink cursor-pointer rounded-[7px] px-4 py-2.5 text-[12px] font-medium"
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
            className="ui-modal-panel bevel-panel w-full max-w-[560px] cursor-default overflow-hidden rounded-[24px] bg-[#fcfcfb]"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(177,234,224,.96),transparent_40%),radial-gradient(circle_at_83%_78%,rgba(199,211,111,.8),transparent_42%),radial-gradient(circle_at_53%_88%,rgba(56,145,84,.82),transparent_47%),linear-gradient(135deg,#b8e0ca,#79b78d)] px-8 py-11 sm:px-12 sm:py-12">
              <div className="pointer-events-none absolute inset-0 opacity-[.16] [background-image:linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:10px_10px]" />
              <div className="relative flex items-center justify-center gap-3 sm:gap-5">
                <span className="bevel-tile-clay grid size-[58px] place-items-center rounded-[17px]">
                  <SiClaude className="size-7" />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="bevel-tile-ink grid size-[68px] place-items-center rounded-[21px]">
                  <Mark />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="bevel-tile grid size-[58px] place-items-center rounded-[17px]">
                  <HydraMark />
                </span>
                <span className="text-xl font-light text-[#53735e]">→</span>
                <span className="bevel-tile grid size-[58px] place-items-center overflow-hidden rounded-[17px]">
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
                  className="bevel-input mt-2 w-full rounded-[8px] px-3 py-3 text-[13px] placeholder:text-[#a5a8a2]"
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
                  className="landing-cta btn-ink cursor-pointer rounded-[7px] px-4 py-2.5 text-[12px] font-medium disabled:opacity-50"
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

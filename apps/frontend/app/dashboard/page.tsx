"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Archive, BarChart3, Bot, BrainCircuit, ChevronDown, CircleDot,
  Check, Clock3, Copy, Database, FileClock, FolderKanban, KeyRound, LayoutGrid,
  Loader2, LogOut, Network, Plus, Search, Settings2, Sparkles, Terminal,
  WandSparkles, X,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

type Workspace = { id: string; name: string; slug: string };
type ApiKey = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
type Overview = {
  workspace: Workspace;
  metrics: { sessionCount: number; checkpointCount: number; evidenceCount: number };
  latestCheckpoints: Array<{ id: string; task: string; status: string; updatedAt: string; payload: { nextStep?: string } }>;
  latestEvidence: Array<{ id: string; title: string; kind: string; occurredAt: string }>;
  latestEvals: Array<{ id: string; dataset: string; strategy: string; startedAt: string; completedAt: string | null; _count: { results: number } }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function MetricCard({ icon: Icon, label, value, note, tone = "blue" }: { icon: typeof BrainCircuit; label: string; value: string | number; note: string; tone?: "blue" | "violet" | "orange" }) {
  const tones = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", orange: "bg-orange-50 text-orange-600" };
  return <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.025)]">
    <div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-4" /></span><p className="text-sm font-medium text-zinc-700">{label}</p></div>
    <div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tracking-[-.06em] text-zinc-950">{value}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">live</span></div>
  </article>;
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-[#fafafa] p-6"><section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white"><BrainCircuit className="size-6" /></span><h1 className="mt-5 text-2xl font-semibold tracking-[-.05em]">Create your first workspace</h1><p className="mt-2 text-sm leading-6 text-zinc-500">A workspace holds agent sessions, checkpoints, evidence, and Thred’s long-term memory.</p><button onClick={onCreate} disabled={creating} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Create workspace</button></section></main>;
}

function SettingsPanel({ workspace, request }: { workspace: Workspace; request: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys`);
    if (response.ok) setApiKeys((await response.json() as { apiKeys: ApiKey[] }).apiKeys);
    setLoading(false);
  };

  useEffect(() => { void loadKeys(); }, [workspace.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const createKey = async () => {
    setCreating(true);
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys`, { method: "POST", body: JSON.stringify({ name: "MCP development key" }) });
    if (response.ok) {
      const result = await response.json() as { apiKey: ApiKey; secret: string };
      setApiKeys((current) => [result.apiKey, ...current]);
      setRevealedKey(result.secret);
    }
    setCreating(false);
  };

  const revokeKey = async (key: ApiKey) => {
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys/${key.id}/revoke`, { method: "POST" });
    if (response.ok) setApiKeys((current) => current.map((item) => item.id === key.id ? { ...item, revokedAt: new Date().toISOString() } : item));
  };

  return <div className="mx-auto max-w-[960px] p-5 sm:p-8">
    <div><p className="text-xs font-medium uppercase tracking-[.12em] text-zinc-400">Workspace settings</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.055em]">Connect Thred through MCP.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Create a workspace-scoped key, then add the configuration below to Codex, Claude, or Cursor.</p></div>
    <section className="mt-7 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><Terminal className="size-4" /></span><h3 className="font-semibold tracking-[-.035em]">MCP server</h3></div><p className="mt-2 text-xs leading-5 text-zinc-500">Use the key below as <code className="rounded bg-zinc-100 px-1 py-0.5">THRED_API_KEY</code>. Keep it out of source control.</p></div><button onClick={createKey} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">{creating ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}Create API key</button></div>
      {revealedKey && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-amber-900">Copy this key now — it will not be shown again.</p><code className="mt-2 block break-all rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-700">{revealedKey}</code></div><button onClick={() => setRevealedKey(null)} aria-label="Dismiss key" className="text-amber-700"><X className="size-4" /></button></div><button onClick={async () => { await navigator.clipboard.writeText(revealedKey); setCopied(true); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-900">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy key"}</button></div>}
      <pre className="mt-5 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-300"><code>{`{\n  "mcpServers": {\n    "thred": {\n      "command": "npx",\n      "args": ["@thred/mcp"],\n      "env": { "THRED_API_KEY": "thrd_sk_…" }\n    }\n  }\n}`}</code></pre>
    </section>
    <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold tracking-[-.035em]">API keys</h3><p className="mt-1 text-xs text-zinc-500">Keys are scoped to {workspace.name}.</p></div><KeyRound className="size-4 text-zinc-400" /></div><div className="mt-5 divide-y divide-zinc-100">{loading ? <div className="py-7 text-center"><Loader2 className="mx-auto size-4 animate-spin text-zinc-400" /></div> : apiKeys.length ? apiKeys.map((key) => <div key={key.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0"><span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-600"><KeyRound className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{key.name}</p><p className="mt-1 font-mono text-xs text-zinc-400">{key.keyPrefix}••••••••</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${key.revokedAt ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-600"}`}>{key.revokedAt ? "revoked" : "active"}</span>{!key.revokedAt && <button onClick={() => void revokeKey(key)} className="text-xs font-medium text-zinc-500 hover:text-red-600">Revoke</button>}</div>) : <p className="py-7 text-center text-sm text-zinc-400">No API keys yet. Create one to connect an agent.</p>}</div></section>
  </div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [view, setView] = useState<"overview" | "settings">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const request = async (path: string, init?: RequestInit) => fetch(`${apiUrl}${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const loadOverview = async (workspace: Workspace) => {
    const response = await request(`/api/workspaces/${workspace.slug}/overview`);
    if (response.ok) setOverview(await response.json() as Overview);
  };

  useEffect(() => {
    if (!isPending && !session?.user) router.push("/sign-in");
    if (!session?.user) return;
    void (async () => {
      setLoading(true);
      const response = await request("/api/workspaces");
      if (response.ok) {
        const data = await response.json() as { workspaces: Workspace[] };
        setWorkspaces(data.workspaces);
        if (data.workspaces[0]) { setSelected(data.workspaces[0]); await loadOverview(data.workspaces[0]); }
        else router.replace("/workspace");
      }
      setLoading(false);
    })();
  // The auth session identifies when the initial load is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session?.user?.id]);

  const createWorkspace = async () => {
    if (!session?.user) return;
    setCreating(true);
    const response = await request("/api/workspaces", { method: "POST", body: JSON.stringify({ name: `${session.user.name || "My"} workspace` }) });
    if (response.ok) {
      const { workspace } = await response.json() as { workspace: Workspace };
      setWorkspaces((current) => [workspace, ...current]);
      setSelected(workspace);
      await loadOverview(workspace);
    }
    setCreating(false);
  };

  if (isPending || loading) return <main className="grid min-h-screen place-items-center bg-[#fafafa]"><Loader2 className="size-5 animate-spin text-zinc-400" /></main>;
  if (!session?.user) return null;
  if (!selected) return <EmptyState onCreate={createWorkspace} creating={creating} />;

  const navigation = [[LayoutGrid, "Overview"], [BrainCircuit, "Memories"], [Network, "Memory graph"], [Terminal, "Playground"], [BarChart3, "Evals"], [Bot, "Connect agent"]] as const;
  return <main className="min-h-screen bg-[#fafafa] text-zinc-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <aside className="border-b border-zinc-200 bg-[#f6f6f5] p-4 lg:min-h-screen lg:border-b-0 lg:border-r">
      <Link href="/" className="flex items-center gap-2.5 px-2 py-2"><span className="grid size-8 place-items-center rounded-[10px] bg-zinc-950 text-xs font-semibold text-white">t</span><span className="font-semibold tracking-[-.05em]">thred</span></Link>
      <div className="relative mt-5"><button onClick={() => setWorkspaceMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm"><span className="max-w-[160px] truncate font-medium">{selected.name}</span><ChevronDown className="size-4 text-zinc-400" /></button>{workspaceMenuOpen && <div className="absolute z-20 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">{workspaces.map((workspace) => <button key={workspace.id} onClick={() => { setSelected(workspace); setWorkspaceMenuOpen(false); void loadOverview(workspace); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${workspace.id === selected.id ? "bg-zinc-100 font-medium text-zinc-950" : "text-zinc-600 hover:bg-zinc-50"}`}><span className="truncate">{workspace.name}</span>{workspace.id === selected.id && <Check className="size-3.5" />}</button>)}<button onClick={() => { setWorkspaceMenuOpen(false); void createWorkspace(); }} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-zinc-100 px-2.5 pt-2.5 text-left text-xs font-medium text-zinc-600 hover:text-zinc-950"><Plus className="size-3.5" />New workspace</button></div>}</div>
      <div className="mt-4 hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400 lg:flex"><Search className="size-4" /><span>Search workspace</span><kbd className="ml-auto rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[10px]">⌘ K</kbd></div>
      <p className="mt-7 px-2 text-[11px] font-medium uppercase tracking-[.12em] text-zinc-400">Workspace</p>
      <nav className="mt-2 space-y-1">{navigation.map(([Icon, label]) => <button key={label} onClick={() => setView("overview")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${view === "overview" && label === "Overview" ? "bg-white font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900"}`}><Icon className="size-4" />{label}{label === "Evals" && <span className="ml-auto rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">new</span>}</button>)}</nav>
      <p className="mt-7 px-2 text-[11px] font-medium uppercase tracking-[.12em] text-zinc-400">Manage</p>
      <nav className="mt-2 space-y-1"><button onClick={() => setView("overview")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-500 hover:bg-white"><Archive className="size-4" />Sessions</button><button onClick={() => setView("settings")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${view === "settings" ? "bg-white font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-white"}`}><Settings2 className="size-4" />Settings</button></nav>
      <div className="mt-8 rounded-2xl bg-zinc-950 p-4 text-white"><div className="flex items-center gap-2 text-xs font-medium text-zinc-300"><WandSparkles className="size-4" />Get started</div><p className="mt-3 text-sm font-medium leading-5">Connect your first agent.</p><p className="mt-1 text-xs leading-5 text-zinc-400">Save a checkpoint and let the next agent pick up instantly.</p><button className="mt-3 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900">Open guide</button></div>
      <button onClick={async () => { await signOut(); router.push("/"); }} className="mt-4 flex items-center gap-2 px-2 text-xs text-zinc-400 hover:text-zinc-800"><LogOut className="size-3.5" />Sign out</button>
    </aside>
    <section className="min-w-0"><header className="flex min-h-[73px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8"><div><p className="text-xs text-zinc-400">{selected.name}</p><h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold tracking-[-.05em]">{view === "settings" ? <Settings2 className="size-5 text-zinc-500" /> : <LayoutGrid className="size-5 text-zinc-500" />}{view === "settings" ? "Settings" : "Overview"}</h1></div><button onClick={createWorkspace} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-medium text-white"><Plus className="size-3.5" />New workspace</button></header>
      {view === "settings" ? <SettingsPanel workspace={selected} request={request} /> : <div className="mx-auto max-w-[1500px] p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-[-.055em]">Your memory, at a glance.</h2><p className="mt-1 text-sm text-zinc-500">Operational state from your connected agents.</p></div><span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500"><Clock3 className="size-3.5" />Live workspace data</span></div>
        <div className="mt-7 grid gap-4 md:grid-cols-3"><MetricCard icon={Bot} label="Agent sessions" value={overview?.metrics.sessionCount ?? 0} note="Sessions connected to this workspace" /><MetricCard icon={FileClock} label="Active handoffs" value={overview?.metrics.checkpointCount ?? 0} note="Checkpoints ready to resume" tone="violet" /><MetricCard icon={Database} label="Evidence events" value={overview?.metrics.evidenceCount ?? 0} note="Source references captured" tone="orange" /></div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.85fr)]"><section className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold tracking-[-.035em]">Current handoffs</h3><p className="mt-1 text-xs text-zinc-500">The next work your agents can resume.</p></div><button className="text-xs font-medium text-zinc-500 hover:text-zinc-950">View all →</button></div><div className="mt-5 divide-y divide-zinc-100">{overview?.latestCheckpoints.length ? overview.latestCheckpoints.map((checkpoint) => <div key={checkpoint.id} className="flex items-center gap-3 py-4 first:pt-0"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><FolderKanban className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{checkpoint.task}</p><p className="mt-1 truncate text-xs text-zinc-500">{checkpoint.payload?.nextStep ?? "No next step recorded"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${checkpoint.status === "BLOCKED" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{checkpoint.status.replace("_", " ")}</span></div>) : <div className="py-11 text-center"><CircleDot className="mx-auto size-5 text-zinc-300" /><p className="mt-3 text-sm font-medium text-zinc-600">No checkpoints yet</p><p className="mt-1 text-xs text-zinc-400">Ask a connected agent to call <code className="rounded bg-zinc-100 px-1">thread_checkpoint</code>.</p></div>}</div></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-center gap-2"><Activity className="size-4 text-violet-500" /><h3 className="font-semibold tracking-[-.035em]">Evaluation runs</h3></div><div className="mt-5 space-y-3">{overview?.latestEvals.length ? overview.latestEvals.map((run) => <article key={run.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{run.dataset}</p><p className="mt-1 text-xs text-zinc-500">{run.strategy.replace("_", " · ")} · {run._count.results} cases</p></div><span className={`size-2 rounded-full ${run.completedAt ? "bg-emerald-500" : "bg-amber-400"}`} /></div></article>) : <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center"><BarChart3 className="mx-auto size-5 text-zinc-300" /><p className="mt-3 text-sm font-medium text-zinc-600">No eval runs yet</p><p className="mt-1 text-xs leading-5 text-zinc-400">Run LongMemEval to compare Thred against vector RAG.</p></div>}</div></section></div>
        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold tracking-[-.035em]">Evidence activity</h3><p className="mt-1 text-xs text-zinc-500">Recent source material that supports your memory.</p></div><Sparkles className="size-4 text-orange-400" /></div><div className="mt-5 grid gap-3 md:grid-cols-3">{overview?.latestEvidence.length ? overview.latestEvidence.map((event) => <article key={event.id} className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-zinc-400">{event.kind.replace("_", " ")}</p><p className="mt-2 truncate text-sm font-medium">{event.title}</p><p className="mt-1 text-xs text-zinc-400">{date.format(new Date(event.occurredAt))}</p></article>) : <p className="col-span-full rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">Evidence will appear here as agents save checkpoints and memory.</p>}</div></section>
      </div>}
    </section>
  </main>;
}

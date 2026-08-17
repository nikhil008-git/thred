"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, Check, ChevronDown, GitFork, KeyRound, LayoutDashboard, LogOut, Settings, SlidersHorizontal, UserRound } from "lucide-react";
import { SiClaude } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";
import { signOut, useSession } from "@/lib/auth-client";

type Workspace = { id: string; name: string; slug: string };
type ApiKey = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
type View = "overview" | "handoffs" | "mcp" | "apiKeys" | "settings";
type Overview = {
  metrics: { agentCount: number; checkpointCount: number };
  latestSessions: Array<{ id: string; agent: string; startedAt: string; endedAt: string | null }>;
  latestCheckpoints: Array<{ id: string; task: string; status: string; updatedAt: string; payload: { nextStep?: string }; session: { agent: string } }>;
};

function Mark() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" className="size-8 shrink-0" fill="none"><defs><linearGradient id="dashboard-mark" x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse"><stop stopColor="#262927" /><stop offset="1" stopColor="#131514" /></linearGradient></defs><rect width="28" height="28" rx="8.5" fill="url(#dashboard-mark)" /><path d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45" stroke="#F5F7F3" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" /><circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" /><circle cx="7.25" cy="9.1" r="0.52" fill="#202320" /><circle cx="20.75" cy="20.57" r="0.52" fill="#202320" /></svg>;
}

function HydraMark() {
  return <span aria-label="HydraDB" className="relative block size-8 overflow-hidden"><Image src="/hydradb-logo-white.png" alt="" width={1180} height={215} className="absolute left-[3px] top-0 h-8 max-w-none w-auto" /></span>;
}

function ApiKeys({ workspace, request }: { workspace: Workspace; request: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys`);
    if (response.ok) setKeys((await response.json() as { apiKeys: ApiKey[] }).apiKeys);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [workspace.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys`, { method: "POST", body: JSON.stringify({ name: "MCP key" }) });
    if (!response.ok) return;
    const result = await response.json() as { apiKey: ApiKey; secret: string };
    setKeys((current) => [result.apiKey, ...current]);
    setRevealedKey(result.secret);
  };
  const revoke = async (key: ApiKey) => {
    const response = await request(`/api/workspaces/${workspace.slug}/api-keys/${key.id}/revoke`, { method: "POST" });
    if (response.ok) setKeys((current) => current.map((item) => item.id === key.id ? { ...item, revokedAt: new Date().toISOString() } : item));
  };

  return <section id="api-keys" className="mt-10 max-w-[760px]"><div className="flex items-end justify-between gap-5"><div><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">API keys</p><h2 className="mt-2 text-[26px] tracking-[-.05em] text-[#20221f]">Keys for your agents.</h2></div><button onClick={() => void create()} className="landing-cta cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733]">Create key</button></div>
    {revealedKey && <div className="mt-5 border border-[#ded2a9] bg-[#fffcf2] p-4"><p className="text-[12px] font-medium text-[#5f552f]">Copy this now. It won’t be shown again.</p><code className="mt-3 block break-all border border-[#ebe4ca] bg-white px-3 py-2 text-[12px] text-[#33352f]">{revealedKey}</code><button onClick={() => void navigator.clipboard.writeText(revealedKey)} className="mt-3 cursor-pointer text-[12px] font-medium text-[#343733] underline underline-offset-4">Copy key</button></div>}
    <div className="mt-5 divide-y divide-[#eceeea] border-y border-[#eceeea]">{loading ? <p className="py-5 text-[13px] text-[#858881]">Loading keys…</p> : keys.length ? keys.map((key) => <div key={key.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-[13px] font-medium text-[#30322f]">{key.name}</p><p className="mt-1 font-mono text-[11px] text-[#8a8d87]">{key.keyPrefix}•••••••• {key.lastUsedAt ? `· used ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(key.lastUsedAt))}` : "· not used yet"}</p></div>{key.revokedAt ? <span className="text-[11px] text-[#999b96]">revoked</span> : <button onClick={() => void revoke(key)} className="cursor-pointer text-[12px] text-[#777a74] underline underline-offset-4 hover:text-[#1d211e]">Revoke</button>}</div>) : <p className="py-5 text-[13px] text-[#858881]">No keys yet.</p>}</div>
  </section>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const request = (path: string, init?: RequestInit) => fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });

  useEffect(() => {
    if (!isPending && !session?.user) { router.replace("/sign-in"); return; }
    if (!session?.user) return;
    void (async () => {
      const response = await request("/api/workspaces");
      if (response.ok) {
        const data = await response.json() as { workspaces: Workspace[] };
        setWorkspaces(data.workspaces);
        if (data.workspaces[0]) setWorkspace(data.workspaces[0]);
        else router.replace("/workspace");
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session?.user?.id]);

  useEffect(() => {
    if (!workspace) return;
    void (async () => {
      const response = await request(`/api/workspaces/${workspace.slug}/overview`);
      if (response.ok) setOverview(await response.json() as Overview);
      else setOverview(null);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.slug]);

  useEffect(() => {
    if (workspace) {
      setSettingsName(workspace.name);
      setSettingsMessage(null);
    }
  }, [workspace]);

  const createWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) { setWorkspaceError("Give your workspace a name."); return; }
    setCreatingWorkspace(true);
    setWorkspaceError(null);
    const response = await request("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setWorkspaceError(body?.error ?? "Couldn’t create the workspace.");
      setCreatingWorkspace(false);
      return;
    }
    const { workspace: created } = await response.json() as { workspace: Workspace };
    setWorkspaces((current) => [created, ...current]);
    setWorkspace(created);
    setWorkspaceName("");
    setNewWorkspaceOpen(false);
    setCreatingWorkspace(false);
  };

  const saveWorkspaceSettings = async () => {
    const name = settingsName.trim();
    if (!name) { setSettingsMessage("Give your workspace a name."); return; }
    setSavingSettings(true);
    setSettingsMessage(null);
    if (!workspace) return;
    const response = await request(`/api/workspaces/${workspace.slug}`, { method: "PATCH", body: JSON.stringify({ name }) });
    const body = await response.json().catch(() => null) as { workspace?: Workspace; error?: string } | null;
    if (!response.ok || !body?.workspace) {
      setSettingsMessage(body?.error ?? "Couldn’t save those settings.");
      setSavingSettings(false);
      return;
    }
    setWorkspace(body.workspace);
    setWorkspaces((current) => current.map((item) => item.id === body.workspace!.id ? body.workspace! : item));
    setSettingsMessage("Saved.");
    setSavingSettings(false);
  };

  if (isPending || loading || !workspace) return <main className="min-h-screen bg-[#fcfcfb]" />;
  return <main className="min-h-screen bg-white text-[#242622] lg:grid lg:grid-cols-[218px_minmax(0,1fr)]">
    <aside className="flex min-h-screen flex-col bg-[#f1f2f0] px-4 py-7 lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:overflow-y-auto">
      <Link href="/" className="flex items-center gap-2.5 px-2 text-[19px] font-semibold tracking-[-.07em]"><Mark />thred</Link>
      <div className="mt-8"><p className="px-2 text-[11px] font-medium text-[#5f635d]">Workspace</p><nav className="mt-2 space-y-0.5"><button onClick={() => setView("overview")} className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition-colors ${view === "overview" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#eff1ee] hover:text-[#20221f]"}`}><LayoutDashboard className="size-[17px] text-[#7b8079]" strokeWidth={1.8} />Overview</button><button onClick={() => setView("handoffs")} className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition-colors ${view === "handoffs" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#eff1ee] hover:text-[#20221f]"}`}><GitFork className="size-[17px] text-[#7b8079]" strokeWidth={1.8} />Handoffs</button></nav></div>
      <div className="mt-8"><p className="px-2 text-[11px] font-medium text-[#5f635d]">Configure</p><nav className="mt-2 space-y-0.5"><button onClick={() => setView("mcp")} className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition-all duration-200 hover:translate-x-0.5 ${view === "mcp" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}><span className="grid size-[17px] place-items-center rounded-[5px] bg-[#1d211e]"><Mark /></span>MCP connection</button><button onClick={() => setView("apiKeys")} className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition-all duration-200 hover:translate-x-0.5 ${view === "apiKeys" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}><KeyRound className="size-[17px] text-[#7b8079]" strokeWidth={1.8} />API keys</button><button onClick={() => setView("settings")} className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] transition-all duration-200 hover:translate-x-0.5 ${view === "settings" ? "bg-[#e5e6e4] font-medium text-[#20221f]" : "text-[#656963] hover:bg-[#e8ebe7] hover:text-[#20221f]"}`}><Settings className="size-[17px] text-[#7b8079]" strokeWidth={1.8} />Workspace settings</button></nav></div>
      <button onClick={() => { setWorkspaceError(null); setNewWorkspaceOpen(true); }} className="mt-7 flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12px] text-[#656963] hover:bg-[#eff1ee] hover:text-[#20221f]"><KeyRound className="size-[17px] text-[#7b8079]" strokeWidth={1.8} />New workspace</button>
      <div className="mt-auto pt-8"><div className="relative">{accountMenuOpen && <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-30 rounded-[16px] border border-[#e2e5e0] bg-white p-3 shadow-[0_18px_45px_rgba(29,40,31,.17)]"><p className="truncate px-2 pb-3 text-[13px] font-medium text-[#252824]">{session?.user?.name ?? session?.user?.email}</p><div className="space-y-1 border-t border-[#eceeea] pt-2"><button onClick={() => { setAccountMenuOpen(false); setView("settings"); }} className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2.5 text-left text-[12px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"><SlidersHorizontal className="size-[17px]" />Workspace settings</button><button onClick={() => { setAccountMenuOpen(false); setView("apiKeys"); }} className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2.5 text-left text-[12px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"><KeyRound className="size-[17px]" />API keys</button><Link href="/#mcp" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-3 rounded-[8px] px-2 py-2.5 text-[12px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"><BookOpen className="size-[17px]" />SDK documentation</Link><button onClick={async () => { await signOut(); router.replace("/"); }} className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2.5 text-left text-[12px] text-[#60645e] hover:bg-[#f4f5f2] hover:text-[#20221f]"><LogOut className="size-[17px]" />Sign out</button></div></div>}<button onClick={() => setAccountMenuOpen((open) => !open)} className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 text-left text-[12px] text-[#656963] transition-colors hover:bg-[#eff1ee]"><span className="grid size-8 place-items-center rounded-full bg-[#e8ece7]"><UserRound className="size-4" /></span><span className="min-w-0 flex-1 truncate">{session?.user?.name ?? session?.user?.email}</span><ChevronDown className={`size-3.5 transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`} /></button></div><div className="relative mt-3"><button onClick={() => setWorkspaceMenuOpen((open) => !open)} className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] bg-[#eef0ed] px-3 py-3 text-left text-[12px] text-[#343733] transition-colors hover:bg-[#e7eae5]"><span className="min-w-0 flex-1 truncate font-medium">{workspace.name}</span><ChevronDown className={`size-3.5 transition-transform duration-200 ${workspaceMenuOpen ? "rotate-180" : ""}`} /></button>{workspaceMenuOpen && <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-[12px] border border-[#dadfd7] bg-white p-1.5 shadow-[0_14px_32px_rgba(29,40,31,.14)]">{workspaces.map((item) => <button key={item.id} onClick={() => { setWorkspace(item); setWorkspaceMenuOpen(false); }} className={`flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[12px] ${item.id === workspace.id ? "bg-[#eff1ee] font-medium text-[#20221f]" : "text-[#62665f] hover:bg-[#f5f6f3]"}`}><span className="min-w-0 flex-1 truncate">{item.name}</span>{item.id === workspace.id && <Check className="size-3.5" />}</button>)}<div className="my-1 border-t border-[#eceeea]" /><button onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceError(null); setNewWorkspaceOpen(true); }} className="w-full cursor-pointer rounded-[7px] px-2.5 py-2 text-left text-[12px] text-[#62665f] hover:bg-[#f5f6f3]">Create workspace</button></div>}</div></div>
    </aside>
    <section className="min-w-0 bg-white"><header className="flex h-[78px] items-center justify-between bg-[#f1f2f0] px-7 sm:px-12"><div><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">Workspace</p><p className="mt-1 text-[13px] font-medium text-[#30322f]">{workspace.name}</p></div><button onClick={() => setView("mcp")} className="landing-cta cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733]">{view === "mcp" ? "MCP setup" : "Connect agent"}</button></header>
      <div className="min-h-[calc(100vh-78px)] rounded-tl-[30px] bg-white"><div className="mx-auto max-w-[940px] px-7 py-14 sm:px-12 sm:py-16">{view === "overview" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Workspace memory</p><h1 className="mt-4 max-w-[650px] text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[50px]">Memory for the work in motion.</h1><p className="mt-5 max-w-[535px] text-[14px] font-medium leading-6 text-[#686c66]">Connect an agent once. Thred keeps the next agent oriented with the decisions and checkpoints that matter.</p><div className="mt-10 max-w-[760px] py-5 sm:flex sm:items-center sm:justify-between"><div><p className="text-[14px] font-medium text-[#30322f]">{overview?.metrics.agentCount ? `${overview.metrics.agentCount} agent session${overview.metrics.agentCount === 1 ? "" : "s"} connected.` : "Your workspace is ready."}</p><p className="mt-1 text-[12px] leading-5 text-[#73776f]">{overview?.metrics.agentCount ? `${overview.metrics.checkpointCount} resumable handoff${overview.metrics.checkpointCount === 1 ? "" : "s"} in this workspace.` : "Create an MCP key to connect your first agent."}</p></div><button onClick={() => setView("mcp")} className="landing-cta mt-4 cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733] sm:mt-0">{overview?.metrics.agentCount ? "Manage MCP" : "Connect agent"}</button></div>{overview?.latestCheckpoints.length ? <section className="mt-11"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">Latest handoffs</p><div className="mt-4 divide-y border-y border-[#e6e9e4]">{overview.latestCheckpoints.map((checkpoint) => <div key={checkpoint.id} className="py-4"><p className="text-[13px] font-medium text-[#30322f]">{checkpoint.task}</p><p className="mt-1 text-[12px] text-[#73776f]">{checkpoint.payload?.nextStep ?? `${checkpoint.status.toLowerCase()} · ${checkpoint.session.agent.toLowerCase()}`}</p></div>)}</div></section> : null}</>}
        {view === "handoffs" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Handoffs</p><h1 className="mt-4 text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[50px]">Ready for the next agent.</h1><p className="mt-5 max-w-[520px] text-[14px] font-medium leading-6 text-[#686c66]">Every checkpoint your agents save becomes a resumable piece of work here.</p><div className="mt-10 divide-y border-y border-[#e3e7e1]">{overview?.latestCheckpoints.length ? overview.latestCheckpoints.map((checkpoint) => <article key={checkpoint.id} className="py-5"><p className="text-[14px] font-medium text-[#2a2d29]">{checkpoint.task}</p><p className="mt-1 text-[12px] text-[#73776f]">{checkpoint.payload?.nextStep ?? `${checkpoint.status.toLowerCase()} · saved by ${checkpoint.session.agent.toLowerCase()}`}</p></article>) : <div className="py-8"><p className="text-[14px] font-medium text-[#30332e]">No handoffs yet.</p><p className="mt-1 text-[12px] leading-5 text-[#73776f]">Connect your agent, then call <code className="rounded bg-[#eef0ed] px-1.5 py-0.5 font-mono text-[11px]">thred_checkpoint</code> when work is ready to pass on.</p></div>}</div></>}
        {view === "mcp" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">MCP connection</p><h1 className="mt-4 text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[48px]">Bring Thred into your agent.</h1><p className="mt-6 max-w-[540px] text-[14px] leading-6 text-[#73766f]">Create an API key, then add this configuration to Codex, Claude, or Cursor.</p><pre className="mt-9 overflow-x-auto rounded-[12px] bg-[#20221f] p-5 text-[12px] leading-6 text-[#e8ebe6] shadow-[0_12px_30px_rgba(25,30,26,.12)]"><code>{`{\n  "mcpServers": {\n    "thred": {\n      "command": "npx",\n      "args": ["@thred/mcp"],\n      "env": { "THRED_API_KEY": "thrd_sk_…" }\n    }\n  }\n}`}</code></pre></>}
        {view === "apiKeys" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">API keys</p><h1 className="mt-4 text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[48px]">Give your agent access.</h1><p className="mt-6 max-w-[540px] text-[14px] leading-6 text-[#73766f]">Create one key for each agent or environment. The secret is shown only once.</p><ApiKeys workspace={workspace} request={request} /></>}
        {view === "settings" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Workspace settings</p><h1 className="mt-4 max-w-[600px] text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[50px]">Make this space yours.</h1><p className="mt-5 max-w-[520px] text-[14px] font-medium leading-6 text-[#686c66]">Name the place your agents will use to share context, checkpoints, and durable memory.</p><form onSubmit={(event) => { event.preventDefault(); void saveWorkspaceSettings(); }} className="mt-10 max-w-[620px] border-t border-[#e2e6df] pt-7"><label className="block text-[12px] font-medium text-[#3f433d]">Workspace name<input value={settingsName} onChange={(event) => { setSettingsName(event.target.value); setSettingsMessage(null); }} className="mt-2 w-full rounded-[7px] border border-[#dfe3dc] bg-white px-3 py-3 text-[13px] text-[#282b27] outline-none transition focus:border-[#767d73] focus:ring-2 focus:ring-[#dce5dc]" /></label><div className="mt-5"><p className="text-[12px] font-medium text-[#3f433d]">Workspace URL</p><p className="mt-2 rounded-[7px] border border-[#e4e7e1] bg-[#f5f6f3] px-3 py-3 font-mono text-[12px] text-[#777b74]">thred.dev/{workspace.slug}</p></div>{settingsMessage && <p className={`mt-4 text-[12px] ${settingsMessage === "Saved." ? "text-[#477152]" : "text-red-600"}`}>{settingsMessage}</p>}<button disabled={savingSettings} className="landing-cta mt-6 cursor-pointer rounded-[6px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733] disabled:cursor-not-allowed disabled:opacity-50">{savingSettings ? "Saving…" : "Save changes"}</button></form></>}
      </div></div>
    </section>
    {newWorkspaceOpen && <div onClick={() => setNewWorkspaceOpen(false)} className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#172018]/25 p-5 backdrop-blur-[5px]"><form onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void createWorkspace(); }} className="w-full max-w-[560px] cursor-default overflow-hidden rounded-[24px] border border-white/70 bg-[#fcfcfb] shadow-[0_28px_90px_rgba(24,32,26,.22)]"><div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(177,234,224,.96),transparent_40%),radial-gradient(circle_at_83%_78%,rgba(199,211,111,.8),transparent_42%),radial-gradient(circle_at_53%_88%,rgba(56,145,84,.82),transparent_47%),linear-gradient(135deg,#b8e0ca,#79b78d)] px-8 py-11 sm:px-12 sm:py-12"><div className="pointer-events-none absolute inset-0 opacity-[.16] [background-image:linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:10px_10px]" /><div className="relative flex items-center justify-center gap-3 sm:gap-5"><span className="grid size-[58px] place-items-center rounded-[17px] border border-white/70 bg-white text-[#5c6b61] shadow-[0_8px_20px_rgba(38,63,46,.15)]"><SiClaude className="size-7" /></span><span className="text-xl font-light text-[#53735e]">→</span><span className="grid size-[68px] place-items-center rounded-[21px] bg-[#1c211e] shadow-[0_10px_24px_rgba(24,42,29,.24)]"><Mark /></span><span className="text-xl font-light text-[#53735e]">→</span><span className="grid size-[58px] place-items-center rounded-[17px] border border-white/70 bg-white shadow-[0_8px_20px_rgba(38,63,46,.15)]"><HydraMark /></span><span className="text-xl font-light text-[#53735e]">→</span><span className="grid size-[58px] place-items-center rounded-[17px] border border-white/70 bg-white text-[#5d685f] shadow-[0_8px_20px_rgba(38,63,46,.15)]"><RiOpenaiFill className="size-7" /></span></div></div><div className="p-7 sm:p-9"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">New workspace</p><h2 className="mt-3 text-[30px] tracking-[-.065em] text-[#1d201d]">Start a fresh thread.</h2><p className="mt-2 text-[13px] leading-5 text-[#777a74]">Give this workspace a clear project or team name. Your connected agents will share its memory.</p><label className="mt-6 block text-[12px] font-medium text-[#4e514c]">Workspace name<input autoFocus value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Acme engineering" className="mt-2 w-full rounded-[8px] border border-[#dfe3dc] bg-white px-3 py-3 text-[13px] outline-none placeholder:text-[#a5a8a2] focus:border-[#7c827a]" /></label>{workspaceError && <p className="mt-3 text-[12px] text-red-600">{workspaceError}</p>}<div className="mt-7 flex items-center justify-between gap-4"><button type="button" onClick={() => setNewWorkspaceOpen(false)} className="cursor-pointer text-[12px] text-[#777a74] hover:text-[#20221f]">Maybe later</button><button disabled={creatingWorkspace} className="cursor-pointer rounded-[7px] bg-[#1b1d1b] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] disabled:opacity-50">{creatingWorkspace ? "Creating…" : "Create workspace"}</button></div></div></form></div>}
  </main>;
}

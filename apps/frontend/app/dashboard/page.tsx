"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

type Workspace = { id: string; name: string; slug: string };
type ApiKey = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
type View = "overview" | "mcp" | "settings";
type Overview = {
  metrics: { agentCount: number; checkpointCount: number };
  latestSessions: Array<{ id: string; agent: string; startedAt: string; endedAt: string | null }>;
  latestCheckpoints: Array<{ id: string; task: string; status: string; updatedAt: string; payload: { nextStep?: string }; session: { agent: string } }>;
};

function Mark() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" className="size-8 shrink-0" fill="none"><defs><linearGradient id="dashboard-mark" x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse"><stop stopColor="#262927" /><stop offset="1" stopColor="#131514" /></linearGradient></defs><rect width="28" height="28" rx="8.5" fill="url(#dashboard-mark)" /><path d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45" stroke="#F5F7F3" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" /><circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" /><circle cx="7.25" cy="9.1" r="0.52" fill="#202320" /><circle cx="20.75" cy="20.57" r="0.52" fill="#202320" /></svg>;
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

  return <section className="mt-10 rounded-[14px] border border-[#e4e7e1] bg-white p-5 shadow-[0_10px_35px_rgba(35,45,38,.04)] sm:p-6"><div className="flex items-end justify-between gap-5"><div><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">API keys</p><h2 className="mt-2 text-[22px] tracking-[-.05em] text-[#20221f]">Keys for your agents.</h2></div><button onClick={() => void create()} className="cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733]">Create key</button></div>
    {revealedKey && <div className="mt-5 border border-[#ded2a9] bg-[#fffcf2] p-4"><p className="text-[12px] font-medium text-[#5f552f]">Copy this now. It won’t be shown again.</p><code className="mt-3 block break-all border border-[#ebe4ca] bg-white px-3 py-2 text-[12px] text-[#33352f]">{revealedKey}</code><button onClick={() => void navigator.clipboard.writeText(revealedKey)} className="mt-3 cursor-pointer text-[12px] font-medium text-[#343733] underline underline-offset-4">Copy key</button></div>}
    <div className="mt-5 divide-y divide-[#eceeea] border-y border-[#eceeea]">{loading ? <p className="py-5 text-[13px] text-[#858881]">Loading keys…</p> : keys.length ? keys.map((key) => <div key={key.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-[13px] font-medium text-[#30322f]">{key.name}</p><p className="mt-1 font-mono text-[11px] text-[#8a8d87]">{key.keyPrefix}•••••••• {key.lastUsedAt ? `· used ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(key.lastUsedAt))}` : "· not used yet"}</p></div>{key.revokedAt ? <span className="text-[11px] text-[#999b96]">revoked</span> : <button onClick={() => void revoke(key)} className="cursor-pointer text-[12px] text-[#777a74] underline underline-offset-4 hover:text-[#1d211e]">Revoke</button>}</div>) : <p className="py-5 text-[13px] text-[#858881]">No keys yet.</p>}</div>
  </section>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
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

  const createWorkspace = async () => {
    const response = await request("/api/workspaces", { method: "POST", body: JSON.stringify({ name: "New workspace" }) });
    if (!response.ok) return;
    const { workspace: created } = await response.json() as { workspace: Workspace };
    setWorkspaces((current) => [created, ...current]);
    setWorkspace(created);
  };

  if (isPending || loading || !workspace) return <main className="min-h-screen bg-[#fcfcfb]" />;
  const title = view === "overview" ? "Overview" : view === "mcp" ? "MCP" : "Settings";

  return <main className="min-h-screen bg-[#fcfcfb] text-[#242622] lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
    <aside className="flex min-h-screen flex-col border-b border-[#e2e5df] bg-[#f4f6f2] px-5 py-6 lg:border-b-0 lg:border-r lg:px-6">
      <Link href="/" className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-.055em]"><Mark />thred</Link>
      <div className="mt-10"><p className="mb-2 text-[10px] font-medium uppercase tracking-[.14em] text-[#91948e]">Workspace</p><select value={workspace.id} onChange={(event) => setWorkspace(workspaces.find((item) => item.id === event.target.value) ?? workspace)} className="w-full cursor-pointer appearance-none rounded-[7px] border border-[#dfe3dc] bg-white px-3 py-2.5 text-[12px] font-medium text-[#3c3f3a] shadow-[0_1px_2px_rgba(35,45,38,.03)] outline-none"><option value={workspace.id}>{workspace.name}</option>{workspaces.filter((item) => item.id !== workspace.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <nav className="mt-8 space-y-1">{(["overview", "mcp", "settings"] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={`block w-full cursor-pointer rounded-[7px] px-3 py-2.5 text-left text-[12px] capitalize transition-colors ${view === item ? "bg-white font-medium text-[#20221f] shadow-[0_1px_2px_rgba(35,45,38,.04)]" : "text-[#777a74] hover:bg-white/65 hover:text-[#20221f]"}`}>{item === "mcp" ? "MCP & API keys" : item}</button>)}</nav>
      <button onClick={() => void createWorkspace()} className="mt-7 w-fit cursor-pointer text-[12px] text-[#777a74] underline decoration-[#c8ccc5] underline-offset-4 hover:text-[#20221f]">New workspace</button>
      <div className="mt-auto border-t border-[#e0e3dd] pt-5"><p className="text-[11px] text-[#92958f]">{session?.user?.email}</p><button onClick={async () => { await signOut(); router.replace("/"); }} className="mt-2 w-fit cursor-pointer text-[12px] text-[#777a74] hover:text-[#20221f]">Sign out</button></div>
    </aside>
    <section><header className="flex h-[72px] items-center justify-between border-b border-[#e7e9e5] bg-white/65 px-6 sm:px-10"><div className="flex items-center gap-2"><Mark /><span className="text-[12px] text-[#777a74]">{workspace.name}</span></div><p className="text-[11px] font-medium uppercase tracking-[.12em] text-[#969992]">{title}</p></header>
      <div className="mx-auto max-w-[820px] px-6 py-14 sm:px-10 sm:py-20">{view === "overview" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Workspace memory</p><h1 className="mt-4 max-w-[600px] text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[48px]">Memory for the work in motion.</h1><p className="mt-6 max-w-[510px] text-[14px] leading-6 text-[#73766f]">Connect an agent once. Thred keeps the next agent oriented with the decisions and checkpoints that matter.</p><div className="mt-9 rounded-[14px] border border-[#e2e6df] bg-white p-5 shadow-[0_12px_38px_rgba(35,45,38,.045)] sm:flex sm:items-center sm:justify-between"><div><p className="text-[13px] font-medium text-[#30322f]">{overview?.metrics.agentCount ? `${overview.metrics.agentCount} agent session${overview.metrics.agentCount === 1 ? "" : "s"} connected.` : "Your workspace is ready."}</p><p className="mt-1 text-[12px] leading-5 text-[#858881]">{overview?.metrics.agentCount ? `${overview.metrics.checkpointCount} resumable handoff${overview.metrics.checkpointCount === 1 ? "" : "s"} in this workspace.` : "Create an MCP key to connect your first agent."}</p></div><button onClick={() => setView("mcp")} className="mt-4 cursor-pointer rounded-[6px] bg-[#1b1d1b] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(21,23,21,.14)] hover:bg-[#343733] sm:mt-0">{overview?.metrics.agentCount ? "Manage MCP" : "Connect agent"}</button></div><div className="mt-10 grid gap-5 md:grid-cols-2"><section className="rounded-[14px] border border-[#e2e6df] bg-white p-5 shadow-[0_12px_38px_rgba(35,45,38,.045)]"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">Connected agents</p><div className="mt-4 divide-y divide-[#eceeea]">{overview?.latestSessions.length ? overview.latestSessions.map((agent) => <div key={agent.id} className="flex items-center justify-between py-3 first:pt-0"><p className="text-[13px] font-medium text-[#30322f]">{agent.agent.toLowerCase()}</p><p className="text-[11px] text-[#8a8d87]">{agent.endedAt ? "completed" : "active"}</p></div>) : <p className="py-3 text-[12px] leading-5 text-[#858881]">No agent sessions yet. Connect one through MCP to see it here.</p>}</div></section><section className="rounded-[14px] border border-[#e2e6df] bg-white p-5 shadow-[0_12px_38px_rgba(35,45,38,.045)]"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#8a8d87]">Recent handoffs</p><div className="mt-4 divide-y divide-[#eceeea]">{overview?.latestCheckpoints.length ? overview.latestCheckpoints.map((checkpoint) => <div key={checkpoint.id} className="py-3 first:pt-0"><p className="text-[13px] font-medium text-[#30322f]">{checkpoint.task}</p><p className="mt-1 text-[11px] text-[#8a8d87]">{checkpoint.payload?.nextStep ?? `${checkpoint.status.toLowerCase()} · ${checkpoint.session.agent.toLowerCase()}`}</p></div>) : <p className="py-3 text-[12px] leading-5 text-[#858881]">No resumable handoffs yet. They appear when an agent saves a checkpoint.</p>}</div></section></div></>}
        {view === "mcp" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">MCP</p><h1 className="mt-4 text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[48px]">Bring Thred into your agent.</h1><p className="mt-6 max-w-[540px] text-[14px] leading-6 text-[#73766f]">Create a key, then add this small configuration to Codex, Claude, or Cursor.</p><pre className="mt-9 overflow-x-auto rounded-[12px] bg-[#20221f] p-5 text-[12px] leading-6 text-[#e8ebe6] shadow-[0_12px_30px_rgba(25,30,26,.12)]"><code>{`{\n  "mcpServers": {\n    "thred": {\n      "command": "npx",\n      "args": ["@thred/mcp"],\n      "env": { "THRED_API_KEY": "thrd_sk_…" }\n    }\n  }\n}`}</code></pre><ApiKeys workspace={workspace} request={request} /></>}
        {view === "settings" && <><p className="text-[10px] font-medium uppercase tracking-[.15em] text-[#8a8d87]">Settings</p><h1 className="mt-4 text-[40px] leading-[.96] tracking-[-.07em] text-[#1b1d1b] sm:text-[48px]">{workspace.name}</h1><div className="mt-9 rounded-[14px] border border-[#e2e6df] bg-white p-6 shadow-[0_12px_38px_rgba(35,45,38,.045)]"><p className="text-[13px] font-medium text-[#30322f]">Workspace</p><p className="mt-2 text-[13px] leading-6 text-[#73766f]">Workspace settings will live here as you add teammates and agent connections.</p></div></>}
      </div>
    </section>
  </main>;
}

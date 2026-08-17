import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { loadDataset } from "./datasets/loaders.js";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import { provisionWorkspaceDatabase, getWorkspaceDatabaseStatus, writeLongTermMemory, recallLongTermMemory } from "@repo/hydra";

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label} after ${ms}ms`)), ms))]);

async function waitHydra(ws: string) {
  for (let i = 0; i < 60; i++) {
    try { await provisionWorkspaceDatabase(ws); } catch {}
    try { const s = await getWorkspaceDatabaseStatus(ws); if ((s.data as any)?.infra?.readyForIngestion) return; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("hydra timeout");
}

const cases = await loadDataset("/private/tmp/thred-benchmarks/longmemeval-data/longmemeval_s_cleaned.json", "longmemeval-v2");
// pick the session with the most messages to stress the large-input path
const c = cases[0];
let big = c.sessions[0];
for (const s of c.sessions) if (s.messages.length > big.messages.length) big = s;
console.log("biggest session", big.id, "msgs", big.messages.length);

// 1) big extraction
const extractor = new OpenAIMemoryExtractionModel();
const t0 = Date.now();
try {
  const out = await withTimeout(
    extractor.extract({ messages: big.messages, changedFiles: [], testResults: [], evidenceReferences: [] }, "Extract long-term and working memory from this session as JSON."),
    90_000, "extract-big",
  );
  console.log("BIG EXTRACT OK", Date.now() - t0, "ms keys", Object.keys(out as any));
} catch (e) {
  console.log("BIG EXTRACT FAILED after", Date.now() - t0, "ms:", String(e).split("\n")[0]);
}

// 2) recall query
const ws = `d2_${Date.now()}`;
await waitHydra(ws);
await writeLongTermMemory({ workspaceId: ws, sessionId: "s1", kind: "fact", text: "Test subject predicate value.", confidence: 0.9, sourceMessageIds: ["m1"], files: [], evidenceEventIds: [], relations: [] });
const t1 = Date.now();
try {
  const r = await withTimeout(recallLongTermMemory({ workspaceId: ws, query: "test subject predicate", maxResults: 20 }), 90_000, "recall");
  console.log("RECALL OK", Date.now() - t1, "ms chunks", (r as any).data?.chunks?.length ?? "n/a");
} catch (e) {
  console.log("RECALL FAILED after", Date.now() - t1, "ms:", String(e).split("\n")[0]);
}
process.exit(0);

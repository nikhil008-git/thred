import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { loadDataset } from "./datasets/loaders.js";

const cases = await loadDataset("/private/tmp/thred-benchmarks/longmemeval-data/longmemeval_s_cleaned.json", "longmemeval-v2");
const c = cases[0];
console.log("CASE keys:", Object.keys(c));
console.log("sessions:", c.sessions.length, "contextEntries:", (c as any).contextEntries?.length ?? "NONE");
if ((c as any).contextEntries?.length) {
  const e = (c as any).contextEntries[0];
  console.log("contextEntry[0] keys:", Object.keys(e));
  console.log("sample:", JSON.stringify(e).slice(0, 400));
}
// tiny gemini quota check
const t0 = Date.now();
try {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GEMINI_API_KEY}` },
    body: JSON.stringify({ model: process.env.MEMORY_EXTRACTION_MODEL, messages: [{ role: "user", content: "say ok" }] }),
  });
  console.log("GEMINI tiny status", r.status, Date.now() - t0, "ms");
} catch (e) { console.log("GEMINI tiny err", String(e).split("\n")[0]); }
process.exit(0);

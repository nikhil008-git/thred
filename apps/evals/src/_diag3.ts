import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { loadDataset } from "./datasets/loaders.js";

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label}`)), ms))]);

const cases = await loadDataset("/private/tmp/thred-benchmarks/longmemeval-data/longmemeval_s_cleaned.json", "longmemeval-v2");
const c = cases[0];
let big = c.sessions[0];
for (const s of c.sessions) if (s.messages.length > big.messages.length) big = s;
console.log("biggest session", big.id, "msgs", big.messages.length);

const instructions = "Return ONLY a JSON object. Keys: longTerm (array of {kind,subject,predicate,value,reason,confidence,sourceMessageIds,files}) and workingMemory (object or null). No prose, no markdown.";
const userContent = JSON.stringify({ messages: big.messages, changedFiles: [], testResults: [], evidenceReferences: [] });
const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const headers = { "content-type": "application/json", authorization: `Bearer ${process.env.GEMINI_API_KEY}` };

async function test(label: string, responseFormat: unknown) {
  const t0 = Date.now();
  try {
    const res = await withTimeout(fetch(url, { method: "POST", headers, body: JSON.stringify({ model: process.env.MEMORY_EXTRACTION_MODEL, max_completion_tokens: 4096, messages: [{ role: "system", content: instructions }, { role: "user", content: userContent }], ...(responseFormat ? { response_format: responseFormat } : {}) }) }), 120_000, label);
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content ?? "";
    console.log(`${label}: status ${res.status} in ${Date.now() - t0}ms contentLen ${content.length}`);
  } catch (e) {
    console.log(`${label}: FAILED in ${Date.now() - t0}ms: ${String(e).split("\n")[0]}`);
  }
}

await test("NO-format", undefined);
await test("json_object", { type: "json_object" });
process.exit(0);

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { prisma } from "@repo/db";

const runId = process.argv[2];
if (!runId) { console.log("usage: _poll <runId>"); process.exit(1); }
const r = await prisma.evalRun.findUnique({
  where: { id: runId },
  include: { _count: { select: { results: true } } },
});
if (!r) { console.log("run not found"); process.exit(1); }
const errs = await prisma.evalCaseResult.count({ where: { evalRunId: runId, answer: "EVAL_ERROR" } });
console.log(`run ${r.id} strategy=${r.strategy} results=${r._count.results}/500`);
console.log(`EVAL_ERROR cases: ${errs}`);
process.exit(0);

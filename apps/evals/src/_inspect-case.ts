import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { prisma } from "@repo/db";

const runId = process.argv[2];
const caseId = process.argv[3];
if (!runId || !caseId) {
  console.log("usage: _inspect-case <runId> <caseId>");
  process.exit(1);
}

const row = await prisma.evalCaseResult.findFirst({ where: { evalRunId: runId, caseId } });
if (!row) {
  console.log("case not found");
  process.exit(1);
}

const evidence = row.evidence as {
  ingestion?: Array<{ sessionId: string; extractedClaims: number; writtenClaims: number; decisions: string[] }>;
  retrieval?: { status?: string; reason?: string; memories?: Array<{ id: string; score: number; relevancyScore: number }> };
  answerContext?: string;
};

console.log("QUESTION:", row.question);
console.log("EXPECTED:", row.expectedAnswer);
console.log("ANSWER  :", row.answer);
console.log("CORRECT :", row.answerCorrect);
console.log("");

const ingestion = evidence.ingestion ?? [];
const totalExtracted = ingestion.reduce((sum, item) => sum + item.extractedClaims, 0);
const totalWritten = ingestion.reduce((sum, item) => sum + item.writtenClaims, 0);
const decisions = ingestion.flatMap((item) => item.decisions);
const counts = decisions.reduce<Record<string, number>>((acc, decision) => {
  acc[decision] = (acc[decision] ?? 0) + 1;
  return acc;
}, {});
console.log(`SESSIONS: ${ingestion.length}  extracted=${totalExtracted} written=${totalWritten}`);
console.log("DECISIONS:", counts);
console.log("");

console.log("RETRIEVAL status:", evidence.retrieval?.status, "reason:", evidence.retrieval?.reason ?? "-");
console.log("MEMORIES returned:", evidence.retrieval?.memories?.length ?? 0);
console.log("");
console.log("--- ANSWER CONTEXT ---");
console.log(evidence.answerContext ?? "(none)");

process.exit(0);

import assert from "node:assert/strict";
import test from "node:test";
import { parseExtractedRelevantContext } from "./schema.js";

test("accepts evidence-backed claims and a compact checkpoint", () => {
  const result = parseExtractedRelevantContext({
    longTerm: [{ kind: "decision", subject: "Production database", predicate: "uses", value: "PostgreSQL", confidence: 0.92, sourceMessageIds: ["m1"], files: ["infra/db.ts"] }],
    workingMemory: { taskKey: "db", task: "Migrate database", status: "IN_PROGRESS", completed: [], filesChanged: [], tests: [], blockers: [], nextStep: "Run migration" },
  });
  assert.equal(result.longTerm[0]?.value, "PostgreSQL");
  assert.equal(result.workingMemory?.nextStep, "Run migration");
});

test("rejects a claim without a valid confidence score", () => {
  assert.throws(() => parseExtractedRelevantContext({
    longTerm: [{ kind: "fact", subject: "A", predicate: "is", value: "B", confidence: 2, sourceMessageIds: [], files: [] }],
  }), /confidence/);
});

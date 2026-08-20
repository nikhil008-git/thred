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

test("keeps long-term claims when the checkpoint is incomplete", () => {
  const result = parseExtractedRelevantContext({
    longTerm: [{ kind: "fact", subject: "auth database", predicate: "uses", value: "PostgreSQL", confidence: 0.9, sourceMessageIds: ["m1"], files: [] }],
    workingMemory: { task: "Migrate database", status: "IN_PROGRESS" },
  });
  assert.equal(result.longTerm.length, 1);
  assert.equal(result.workingMemory, undefined);
});

test("defaults invalid kind and confidence instead of rejecting the claim", () => {
  const result = parseExtractedRelevantContext({
    longTerm: [{ kind: "note", subject: "A", predicate: "is", value: "B", confidence: 2, sourceMessageIds: [], files: [] }],
  });
  assert.equal(result.longTerm[0]?.kind, "fact");
  assert.equal(result.longTerm[0]?.confidence, 0.5);
});

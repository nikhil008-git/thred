import assert from "node:assert/strict";
import test from "node:test";
import { shouldAbstain } from "./abstention.js";
import { resolveRevision } from "./revision-resolver.js";
import { normalizeEntity } from "./entity-resolver.js";

const claim = { kind: "fact" as const, subject: "Production database", predicate: "uses", value: "PostgreSQL", confidence: 0.9, sourceMessageIds: ["m1"], files: [] };

test("detects unchanged and overwritten claims", () => {
  const current = { id: "old", subject: "production database", predicate: "uses", value: "MongoDB", updatedAt: new Date("2026-01-01") };
  assert.deepEqual(resolveRevision({ ...claim, value: "MongoDB" }, [current]).operation, "IGNORE");
  assert.deepEqual(resolveRevision(claim, [current]), {
    operation: "SUPERSEDE", semanticKey: "production database::uses", supersededMemoryId: "old",
  });
});

test("abstains without provenance or relevant evidence", () => {
  assert.deepEqual(shouldAbstain([]), { abstain: true, reason: "NO_RESULTS" });
  assert.deepEqual(shouldAbstain([{ id: "x", text: "fact", score: 0.8, relevancyScore: 0.8, confidence: 0.9, sourceMessageIds: [], evidenceEventIds: [], files: [], supersedesMemoryIds: [] }]), { abstain: true, reason: "NO_PROVENANCE" });
});

test("normalizes common aliases before matching entities", () => {
  assert.equal(normalizeEntity("Postgre-SQL"), "postgresql");
  assert.equal(normalizeEntity("Mongo DB"), "mongodb");
});

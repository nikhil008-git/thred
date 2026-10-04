import assert from "node:assert/strict";
import test from "node:test";
import { CachedMemoryLookup } from "./memory-cache.js";
import { resolveRevision } from "./revision-resolver.js";
import type { ExistingMemory } from "./revision-resolver.js";

const claim = (value: string) => ({
  kind: "decision" as const,
  subject: "auth database",
  predicate: "uses",
  value,
  confidence: 0.9,
  sourceMessageIds: ["m1"],
  files: [],
});

test("a write recorded in this run supersedes even before HydraDB indexes it", async () => {
  let baseCalls = 0;
  const lookup = new CachedMemoryLookup({
    async findCurrentBySemanticKey(): Promise<ExistingMemory[]> {
      baseCalls += 1;
      return [];
    },
  });

  const first = await lookup.findCurrentBySemanticKey({
    workspaceId: "w1",
    subject: "auth database",
    predicate: "uses",
  });
  assert.deepEqual(resolveRevision(claim("MongoDB"), first).operation, "ADD");

  lookup.recordWrite({
    workspaceId: "w1",
    memoryId: "mem-1",
    subject: "auth database",
    predicate: "uses",
    value: "MongoDB",
  });

  const second = await lookup.findCurrentBySemanticKey({
    workspaceId: "w1",
    subject: "Auth Database",
    predicate: "uses",
  });
  const decision = resolveRevision(claim("PostgreSQL"), second);
  assert.equal(decision.operation, "SUPERSEDE");
  assert.equal(decision.operation === "SUPERSEDE" && decision.supersededMemoryId, "mem-1");
  assert.equal(baseCalls, 1, "a cached semantic key must not trigger another recall");
});

test("keeps workspaces isolated", async () => {
  const lookup = new CachedMemoryLookup({
    async findCurrentBySemanticKey(): Promise<ExistingMemory[]> {
      return [];
    },
  });
  lookup.recordWrite({
    workspaceId: "w1",
    memoryId: "mem-1",
    subject: "auth database",
    predicate: "uses",
    value: "MongoDB",
  });
  const other = await lookup.findCurrentBySemanticKey({
    workspaceId: "w2",
    subject: "auth database",
    predicate: "uses",
  });
  assert.deepEqual(other, []);
});

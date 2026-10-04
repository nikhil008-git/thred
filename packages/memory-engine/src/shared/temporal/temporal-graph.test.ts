import assert from "node:assert/strict";
import test from "node:test";
import { TemporalGraph } from "./temporal-graph.js";

function memory(id: string, workspaceId: string, value: string, occurredAt: string) {
  return {
    id, workspaceId, value, occurredAt: new Date(occurredAt),
    sessionId: `session-${id}`, subject: "Production database", predicate: "uses",
    confidence: 0.9, sourceMessageIds: [`message-${id}`], evidenceEventIds: [`evidence-${id}`], files: ["infra/db.ts"],
  };
}

test("keeps history but resolves the newest superseding fact as current", () => {
  const graph = new TemporalGraph();
  graph.add(memory("mongo", "workspace-a", "MongoDB", "2026-01-01"));
  graph.add(memory("postgres", "workspace-a", "PostgreSQL", "2026-02-01"));

  const result = graph.resolve("workspace-a", "production database", "uses");
  assert.equal(result.current[0]?.value, "PostgreSQL");
  assert.deepEqual(result.history.map((item) => item.value), ["MongoDB", "PostgreSQL"]);
  assert.ok(result.edges.some((edge) => edge.predicate === "SUPERSEDES" && edge.to === "mongo"));
  assert.ok(result.edges.some((edge) => edge.predicate === "SUPPORTS"));
});

test("never mixes temporal memories between workspaces", () => {
  const graph = new TemporalGraph();
  graph.add(memory("a", "workspace-a", "PostgreSQL", "2026-01-01"));
  graph.add(memory("b", "workspace-b", "SQLite", "2026-02-01"));

  const result = graph.resolve("workspace-a", "production database", "uses");
  assert.deepEqual(result.history.map((item) => item.id), ["a"]);
});

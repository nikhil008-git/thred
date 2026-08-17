import assert from "node:assert/strict";
import test from "node:test";
import { chunkMessages, extractRelevantContext } from "./extractor.js";

test("splits oversized sessions into extraction chunks", () => {
  const messages = [
    { id: "m1", role: "user" as const, content: "a".repeat(12_000) },
    { id: "m2", role: "assistant" as const, content: "b".repeat(12_000) },
  ];
  const chunks = chunkMessages(messages, 3_500);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]?.[0]?.id, "m1");
  assert.equal(chunks[1]?.[0]?.id, "m2");
});

test("merges long-term claims across extraction chunks", async () => {
  const messages = [
    { id: "m1", role: "user" as const, content: "a".repeat(12_000) },
    { id: "m2", role: "assistant" as const, content: "b".repeat(12_000) },
  ];
  let calls = 0;
  const result = await extractRelevantContext({
    extract: async () => {
      calls += 1;
      return {
        longTerm: [{
          kind: "fact",
          subject: `S${calls}`,
          predicate: "is",
          value: `V${calls}`,
          confidence: 0.9,
          sourceMessageIds: [`m${calls}`],
          files: [],
        }],
      };
    },
  }, { messages, changedFiles: [], testResults: [], evidenceReferences: [] });
  assert.equal(calls, 2);
  assert.equal(result.longTerm.length, 2);
});

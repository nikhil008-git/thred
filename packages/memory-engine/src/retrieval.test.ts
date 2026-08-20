import assert from "node:assert/strict";
import test from "node:test";
import { compactMemoryText } from "./memory-text.js";
import { deriveQueryIntent, expansionQueries } from "./query-intent.js";
import { lexicalOverlap, rankMemories } from "./ranker.js";

test("classifies aggregation, temporal, and preference questions", () => {
  assert.equal(deriveQueryIntent("How many model kits have I bought?").aggregation, true);
  assert.equal(deriveQueryIntent("What was the first issue after the service?").temporal, true);
  assert.equal(deriveQueryIntent("Can you recommend video editing resources?").preference, true);
  assert.equal(deriveQueryIntent("What database does auth use?").aggregation, false);
});

test("expansion drops question words and adds a preference probe", () => {
  const question = "Can you recommend some resources where I can learn more about video editing?";
  const queries = expansionQueries(question, deriveQueryIntent(question));
  assert.ok(queries[0]?.includes("video"));
  assert.ok(!queries[0]?.includes("you"));
  assert.ok(queries.some((query) => query.endsWith("preference")));
});

test("lexical overlap favors the claim naming the asked-about entity", () => {
  const question = "What was my personal best 5K time?";
  const onTopic = lexicalOverlap(question, "personal best 5K time is 25:50.");
  const offTopic = lexicalOverlap(question, "commute duration is 45 minutes each way.");
  assert.ok(onTopic > offTopic);
});

test("ranks a lexically matching claim above a marginally more relevant one", () => {
  const ranked = rankMemories({
    data: {
      chunks: [
        { id: "off", chunkContent: "commute duration is 45 minutes. Source messages: m9.", relevancyScore: 0.62 },
        { id: "on", chunkContent: "personal best 5K time is 25:50. Source messages: m2.", relevancyScore: 0.58 },
      ],
    },
  } as never, { query: "What was my personal best 5K time?" });
  assert.equal(ranked[0]?.id, "on");
});

test("uses a fact's recorded event date rather than upload time for chronology", () => {
  const ranked = rankMemories({
    data: {
      chunks: [{
        id: "event",
        chunkContent: "user attended event. Recorded at: 2023/04/01. Source messages: m1.",
        sourceUploadTime: "2026-08-20T00:00:00.000Z",
        relevancyScore: 0.9,
      }],
    },
  } as never);
  assert.equal(ranked[0]?.recordedAt, "2023-04-01T00:00:00.000Z");
});

test("compacts provenance out of answer context but keeps the assertion and date", () => {
  const compact = compactMemoryText(
    "auth database uses PostgreSQL. Kind: decision. Confidence: 0.9. Recorded at: 2026-03-02. Source messages: m1. Evidence events: none. Files: none.\n\n[Thred provenance: kind=decision; session=s1]",
  );
  assert.equal(compact, "auth database uses PostgreSQL. Recorded at: 2026-03-02.");
});

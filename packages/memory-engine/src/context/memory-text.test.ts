import assert from "node:assert/strict";
import test from "node:test";
import { parseProvenanceBlock } from "./memory-text.js";

const sample = [
  "authentication system uses session-based authentication.",
  "",
  "[Thred provenance: kind=fact; session=s1; confidence=0.95; messages=msg-1,msg-2; evidence=ev-1; files=src/auth.ts; relations=ABOUT:authentication system|FROM_SESSION:s1|SUPPORTS:message:msg-1]",
].join("\n");

test("parseProvenanceBlock extracts embedded Thred provenance", () => {
  assert.deepEqual(parseProvenanceBlock(sample), {
    kind: "fact",
    session: "s1",
    confidence: 0.95,
    messages: ["msg-1", "msg-2"],
    evidence: ["ev-1"],
    files: ["src/auth.ts"],
    relations: [
      { predicate: "ABOUT", target: "authentication system" },
      { predicate: "FROM_SESSION", target: "s1" },
      { predicate: "SUPPORTS", target: "message:msg-1" },
    ],
  });
});

test("parseProvenanceBlock returns null when provenance block is missing", () => {
  assert.equal(parseProvenanceBlock("plain memory text"), null);
});

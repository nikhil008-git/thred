import type { LongTermMemoryInput } from "@repo/hydra";
import type { LongTermMemoryClaim } from "@repo/memory-extractor";
import type { RevisionDecision } from "./revision-resolver.js";

export function buildHydraMemory(
  claim: LongTermMemoryClaim,
  decision: RevisionDecision,
  scope: { workspaceId: string; sessionId: string; evidenceEventIds: string[]; occurredAt?: string },
): LongTermMemoryInput {
  const revisionNote = decision.operation === "SUPERSEDE"
    ? ` This supersedes memory ${decision.supersededMemoryId}.`
    : "";
  const reason = claim.reason ? ` Reason: ${claim.reason}.` : "";
  const sourceMessages = claim.sourceMessageIds.join(", ") || "none";
  const files = claim.files.join(", ") || "none";
  const evidence = scope.evidenceEventIds.join(", ") || "none";
  const relations: NonNullable<LongTermMemoryInput["relations"]> = [
    { predicate: "ABOUT", target: claim.subject },
    { predicate: "FROM_SESSION", target: scope.sessionId },
    ...claim.sourceMessageIds.map((messageId) => ({ predicate: "SUPPORTS" as const, target: `message:${messageId}` })),
    ...scope.evidenceEventIds.map((eventId) => ({ predicate: "SUPPORTS" as const, target: `evidence:${eventId}` })),
    ...claim.files.map((file) => ({ predicate: "TOUCHED_FILE" as const, target: file })),
    ...(decision.operation === "SUPERSEDE"
      ? [{ predicate: "SUPERSEDES" as const, target: `memory:${decision.supersededMemoryId}` }]
      : []),
  ];

  return {
    workspaceId: scope.workspaceId,
    sessionId: scope.sessionId,
    kind: claim.kind,
    // Keep the assertion first: HydraMemoryLookup can still identify a claim by
    // subject + predicate, while the remaining fields make recall inspectable.
    text: `${claim.subject} ${claim.predicate} ${claim.value}. Kind: ${claim.kind}. Confidence: ${claim.confidence}.${scope.occurredAt ? ` Recorded at: ${scope.occurredAt}.` : ""}${reason}${revisionNote} Source messages: ${sourceMessages}. Evidence events: ${evidence}. Files: ${files}.`,
    confidence: claim.confidence,
    evidenceEventIds: scope.evidenceEventIds,
    sourceMessageIds: claim.sourceMessageIds,
    files: claim.files,
    relations,
  };
}

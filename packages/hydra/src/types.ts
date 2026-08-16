export type LongTermMemoryKind = "fact" | "decision" | "lesson" | "architecture" | "preference";

export type LongTermMemoryInput = {
  workspaceId: string;
  sessionId: string;
  kind: LongTermMemoryKind;
  text: string;
  confidence: number;
  evidenceEventIds?: string[];
  sourceMessageIds?: string[];
  files?: string[];
};

export type RecallLongTermMemoryInput = {
  workspaceId: string;
  query: string;
  maxResults?: number;
};

/** Stable package boundary; callers do not depend on SDK-generated response types. */
export type HydraResponse = {
  data?: unknown;
  meta?: unknown;
};

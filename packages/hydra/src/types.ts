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
  /** Explicit semantic relations supplied by Thred's temporal resolver. */
  relations?: Array<{
    predicate: "ABOUT" | "FROM_SESSION" | "SUPPORTS" | "SUPERSEDES" | "TOUCHED_FILE";
    target: string;
  }>;
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

export type HydraMemoryWriteResponse = HydraResponse & {
  data?: {
    results?: Array<{ id?: string }>;
  };
};

export type HydraMemoryQueryResponse = HydraResponse & {
  data?: {
    chunks?: Array<{
      id?: string;
      chunkUuid?: string;
      chunkContent?: string;
      sourceLastUpdatedTime?: string;
      sourceUploadTime?: string;
      relevancyScore?: number;
    }>;
  };
};

export type LongTermMemoryKind = "fact" | "decision" | "lesson" | "architecture" | "preference";

export type MemoryRelation = {
  predicate: "ABOUT" | "FROM_SESSION" | "SUPPORTS" | "SUPERSEDES" | "TOUCHED_FILE";
  target: string;
};

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
  relations?: MemoryRelation[];
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

export type HydraMemoryWriteResponse = {
  data?: {
    results?: { id?: string }[];
  };
};

/** One search result returned by HydraDB recall. */
export type HydraChunk = {
  id?: string;
  chunkUuid?: string;
  chunkContent?: string;
  sourceLastUpdatedTime?: string;
  sourceUploadTime?: string;
  relevancyScore?: number;
};

export type HydraMemoryQueryResponse = {
  data?: {
    chunks?: HydraChunk[];
  };
};

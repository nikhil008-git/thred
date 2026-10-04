export { normalizeEntity, memorySemanticKey } from "./shared/entity-resolver.js";
export { shouldAbstain, type AbstentionResult } from "./context/abstention.js";
export { buildHydraMemory } from "./checkpoint/graph-builder.js";
export { buildMemoryContext, type MemoryContext } from "./context/context-builder.js";
export { buildMemoryHistory, type MemoryHistory } from "./context/history.js";
export { resumeWithMemory, type ResumeWithMemory } from "./resume/resume-context.js";
export { HydraMemoryLookup } from "./checkpoint/hydra-lookup.js";
export { CachedMemoryLookup } from "./checkpoint/memory-cache.js";
export {
  ingestSession,
  type IngestSessionDependencies,
  type IngestSessionInput,
} from "./checkpoint/ingest.js";
export {
  processLongTermClaim,
  type MemoryLookup,
  type ProcessLongTermClaimInput,
  type ProcessedLongTermClaim,
} from "./checkpoint/engine.js";
export {
  resolveRevision,
  type ExistingMemory,
  type RevisionDecision,
} from "./checkpoint/revision-resolver.js";
export { lexicalOverlap, rankMemories, type RankedMemory } from "./context/ranker.js";
export { compactMemoryText, parseProvenanceBlock, type EmbeddedProvenance } from "./context/memory-text.js";
export {
  deriveQueryIntent,
  expansionQueries,
  queryKeywords,
  type QueryIntent,
} from "./context/query-intent.js";
export {
  TemporalGraph,
  type TemporalEdge,
  type TemporalMemory,
  type TemporalRelation,
  type TemporalResolution,
} from "./shared/temporal-graph.js";

import { memorySemanticKey, normalizeEntity } from "./entity-resolver.js";

export type TemporalRelation = "ABOUT" | "FROM_SESSION" | "SUPPORTS" | "SUPERSEDES" | "TOUCHED_FILE";

export type TemporalMemory = {
  id: string;
  workspaceId: string;
  sessionId: string;
  subject: string;
  predicate: string;
  value: string;
  occurredAt: Date;
  confidence: number;
  sourceMessageIds: string[];
  evidenceEventIds: string[];
  files: string[];
};

export type TemporalEdge = {
  from: string;
  predicate: TemporalRelation;
  to: string;
};

export type TemporalResolution = {
  current: TemporalMemory[];
  history: TemporalMemory[];
  edges: TemporalEdge[];
  conflicts: TemporalMemory[];
};

/**
 * Deterministic temporal graph used by the resolver and tests. Production
 * adapters persist the same relation set in HydraDB during ingestion.
 */
export class TemporalGraph {
  private readonly memories = new Map<string, TemporalMemory>();
  private readonly edges: TemporalEdge[] = [];

  add(memory: TemporalMemory): TemporalEdge[] {
    const key = memorySemanticKey(memory.subject, memory.predicate);
    const previous = this.findByKey(memory.workspaceId, key)
      .filter((item) => item.id !== memory.id)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];

    this.memories.set(memory.id, memory);
    const edges: TemporalEdge[] = [
      { from: memory.id, predicate: "ABOUT", to: normalizeEntity(memory.subject) },
      { from: memory.id, predicate: "FROM_SESSION", to: memory.sessionId },
      ...memory.sourceMessageIds.map((id) => ({ from: memory.id, predicate: "SUPPORTS" as const, to: `message:${id}` })),
      ...memory.evidenceEventIds.map((id) => ({ from: memory.id, predicate: "SUPPORTS" as const, to: `evidence:${id}` })),
      ...memory.files.map((file) => ({ from: memory.id, predicate: "TOUCHED_FILE" as const, to: file })),
      ...(previous && normalizeEntity(previous.value) !== normalizeEntity(memory.value)
        ? [{ from: memory.id, predicate: "SUPERSEDES" as const, to: previous.id }]
        : []),
    ];
    this.edges.push(...edges);
    return edges;
  }

  resolve(workspaceId: string, subject: string, predicate: string): TemporalResolution {
    const key = memorySemanticKey(subject, predicate);
    const history = this.findByKey(workspaceId, key)
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    const superseded = new Set(this.edges.filter((edge) => edge.predicate === "SUPERSEDES").map((edge) => edge.to));
    const candidates = history.filter((item) => !superseded.has(item.id));
    const newest = candidates.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
    const current = newest.length ? [newest[0]!] : [];
    const conflicts = newest.slice(1).filter((item) => normalizeEntity(item.value) !== normalizeEntity(newest[0]?.value ?? ""));

    return {
      current,
      history,
      edges: this.edges.filter((edge) => history.some((memory) => memory.id === edge.from || memory.id === edge.to)),
      conflicts,
    };
  }

  private findByKey(workspaceId: string, key: string) {
    return [...this.memories.values()].filter((memory) =>
      memory.workspaceId === workspaceId && memorySemanticKey(memory.subject, memory.predicate) === key,
    );
  }
}

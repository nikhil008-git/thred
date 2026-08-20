export type LongTermMemoryKind = "fact" | "decision" | "lesson" | "architecture" | "preference";
export type WorkingCheckpointStatus = "IN_PROGRESS" | "BLOCKED" | "DONE";

export type LongTermMemoryClaim = {
  kind: LongTermMemoryKind;
  subject: string;
  predicate: string;
  value: string;
  reason?: string;
  confidence: number;
  sourceMessageIds: string[];
  files: string[];
};

export type WorkingMemoryCheckpoint = {
  taskKey: string;
  task: string;
  status: WorkingCheckpointStatus;
  completed: string[];
  filesChanged: string[];
  tests: string[];
  blockers: string[];
  nextStep?: string;
};

export type ExtractedRelevantContext = {
  longTerm: LongTermMemoryClaim[];
  workingMemory?: WorkingMemoryCheckpoint;
};

const memoryKinds = new Set<LongTermMemoryKind>([
  "fact",
  "decision",
  "lesson",
  "architecture",
  "preference",
]);
const checkpointStatuses = new Set<WorkingCheckpointStatus>([
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
]);

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

/**
 * Models that don't honor strict JSON schemas (e.g. Gemini's OpenAI-compatible
 * endpoint) may return snake_case keys. Normalize them so the strict camelCase
 * parser below still validates correctly.
 */
function camelizeKeys(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(camelizeKeys);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z0-9])/g, (_match, char) => String(char).toUpperCase());
      out[camel] = camelizeKeys(val);
    }
    return out;
  }
  return node;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return value.trim();
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function parseLongTerm(value: unknown): LongTermMemoryClaim | null {
  const claim = object(value, "longTerm claim");
  // Models using json_object mode (e.g. Gemini) don't enforce field values, so
  // be tolerant: default a missing/invalid kind to "fact" and confidence to 0.5,
  // and skip claims that lack the core subject/predicate/value.
  const rawKind = typeof claim.kind === "string" ? claim.kind.trim().toLowerCase() : "";
  const kind = (rawKind && memoryKinds.has(rawKind as LongTermMemoryKind) ? rawKind : "fact") as LongTermMemoryKind;

  let confidence = typeof claim.confidence === "number" ? claim.confidence : Number(claim.confidence);
  if (typeof confidence !== "number" || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.5;
  }

  const subject = typeof claim.subject === "string" ? claim.subject.trim() : "";
  const predicate = typeof claim.predicate === "string" ? claim.predicate.trim() : "";
  const claimValue = typeof claim.value === "string" ? claim.value.trim() : "";
  if (!subject || !predicate || !claimValue) return null;

  return {
    kind,
    subject,
    predicate,
    value: claimValue,
    ...(claim.reason === undefined || claim.reason === null
      ? {}
      : { reason: typeof claim.reason === "string" ? claim.reason.trim() : String(claim.reason) }),
    confidence,
    sourceMessageIds: stringList(claim.sourceMessageIds ?? [], "longTerm.sourceMessageIds"),
    files: stringList(claim.files ?? [], "longTerm.files"),
  };
}

function normalizeCheckpointStatus(value: string): WorkingCheckpointStatus {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "IN_PROGRESS" || normalized === "INPROGRESS" || normalized === "ACTIVE") return "IN_PROGRESS";
  if (normalized === "BLOCKED") return "BLOCKED";
  if (normalized === "DONE" || normalized === "COMPLETE" || normalized === "COMPLETED") return "DONE";
  return "IN_PROGRESS";
}

function parseWorkingMemory(value: unknown): WorkingMemoryCheckpoint {
  const checkpoint = object(value, "workingMemory");
  const status = normalizeCheckpointStatus(requiredString(checkpoint.status, "workingMemory.status"));
  const nextStep = checkpoint.nextStep;

  if (nextStep !== undefined && nextStep !== null && (typeof nextStep !== "string" || !nextStep.trim())) {
    throw new Error("workingMemory.nextStep must be a non-empty string when provided");
  }

  return {
    taskKey: requiredString(checkpoint.taskKey, "workingMemory.taskKey"),
    task: requiredString(checkpoint.task, "workingMemory.task"),
    status,
    completed: stringList(checkpoint.completed ?? [], "workingMemory.completed"),
    filesChanged: stringList(checkpoint.filesChanged ?? [], "workingMemory.filesChanged"),
    tests: stringList(checkpoint.tests ?? [], "workingMemory.tests"),
    blockers: stringList(checkpoint.blockers ?? [], "workingMemory.blockers"),
    ...(nextStep ? { nextStep: nextStep.trim() } : {}),
  };
}

/**
 * Working memory is an optional coding handoff, so a model that returns a
 * partial checkpoint must not discard the long-term claims extracted alongside
 * it. Callers that need a checkpoint can validate the absence themselves.
 */
function parseOptionalWorkingMemory(value: unknown): WorkingMemoryCheckpoint | null {
  if (value === undefined || value === null) return null;
  try {
    return parseWorkingMemory(value);
  } catch {
    return null;
  }
}

/** Validates structured output from whichever LLM provider the API uses. */
export function parseExtractedRelevantContext(value: unknown): ExtractedRelevantContext {
  const extracted = object(camelizeKeys(value), "extraction");

  if (!Array.isArray(extracted.longTerm)) throw new Error("longTerm must be an array");

  const workingMemory = parseOptionalWorkingMemory(extracted.workingMemory);
  return {
    longTerm: extracted.longTerm.map(parseLongTerm).filter((claim): claim is LongTermMemoryClaim => claim !== null),
    ...(workingMemory ? { workingMemory } : {}),
  };
}

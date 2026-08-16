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

function parseLongTerm(value: unknown): LongTermMemoryClaim {
  const claim = object(value, "longTerm claim");
  const kind = requiredString(claim.kind, "longTerm.kind") as LongTermMemoryKind;
  const confidence = claim.confidence;

  if (!memoryKinds.has(kind)) throw new Error("longTerm.kind is invalid");
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error("longTerm.confidence must be between 0 and 1");
  }

  return {
    kind,
    subject: requiredString(claim.subject, "longTerm.subject"),
    predicate: requiredString(claim.predicate, "longTerm.predicate"),
    value: requiredString(claim.value, "longTerm.value"),
    ...(claim.reason === undefined
      ? {}
      : { reason: requiredString(claim.reason, "longTerm.reason") }),
    confidence,
    sourceMessageIds: stringList(claim.sourceMessageIds ?? [], "longTerm.sourceMessageIds"),
    files: stringList(claim.files ?? [], "longTerm.files"),
  };
}

function parseWorkingMemory(value: unknown): WorkingMemoryCheckpoint {
  const checkpoint = object(value, "workingMemory");
  const status = requiredString(checkpoint.status, "workingMemory.status") as WorkingCheckpointStatus;
  const nextStep = checkpoint.nextStep;

  if (!checkpointStatuses.has(status)) throw new Error("workingMemory.status is invalid");
  if (nextStep !== undefined && (typeof nextStep !== "string" || !nextStep.trim())) {
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

/** Validates structured output from whichever LLM provider the API uses. */
export function parseExtractedRelevantContext(value: unknown): ExtractedRelevantContext {
  const extracted = object(value, "extraction");

  if (!Array.isArray(extracted.longTerm)) throw new Error("longTerm must be an array");

  return {
    longTerm: extracted.longTerm.map(parseLongTerm),
    ...(extracted.workingMemory === undefined
      ? {}
      : { workingMemory: parseWorkingMemory(extracted.workingMemory) }),
  };
}

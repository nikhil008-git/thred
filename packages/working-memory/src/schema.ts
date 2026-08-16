import type { CheckpointStatus } from "@repo/db";

export type CheckpointPayload = {
  completed: string[];
  filesChanged: string[];
  tests: string[];
  blockers: string[];
  nextStep?: string;
};

export type CheckpointInput = {
  workspaceId: string;
  sessionId: string;
  taskKey: string;
  task: string;
  status: CheckpointStatus;
  payload: CheckpointPayload;
  hydraMemoryIds?: string[];
};

const statuses = new Set<CheckpointStatus>(["IN_PROGRESS", "BLOCKED", "DONE"]);

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value.trim();
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

/** Validates data received from an MCP tool or agent integration. */
export function parseCheckpointInput(value: unknown): CheckpointInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("checkpoint must be an object");
  }

  const input = value as Record<string, unknown>;
  const status = requiredString(input.status, "status") as CheckpointStatus;

  if (!statuses.has(status)) {
    throw new Error("status must be IN_PROGRESS, BLOCKED, or DONE");
  }

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    throw new Error("payload must be an object");
  }

  const payload = input.payload as Record<string, unknown>;
  const nextStep = payload.nextStep;

  if (nextStep !== undefined && (typeof nextStep !== "string" || nextStep.trim().length === 0)) {
    throw new Error("payload.nextStep must be a non-empty string when provided");
  }

  return {
    workspaceId: requiredString(input.workspaceId, "workspaceId"),
    sessionId: requiredString(input.sessionId, "sessionId"),
    taskKey: requiredString(input.taskKey, "taskKey"),
    task: requiredString(input.task, "task"),
    status,
    payload: {
      completed: stringList(payload.completed ?? [], "payload.completed"),
      filesChanged: stringList(payload.filesChanged ?? [], "payload.filesChanged"),
      tests: stringList(payload.tests ?? [], "payload.tests"),
      blockers: stringList(payload.blockers ?? [], "payload.blockers"),
      ...(nextStep ? { nextStep: nextStep.trim() } : {}),
    },
    hydraMemoryIds: stringList(input.hydraMemoryIds ?? [], "hydraMemoryIds"),
  };
}

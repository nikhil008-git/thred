import type { CheckpointStatus } from "@repo/db";
import type { CheckpointPayload } from "./schema.js";
import { findLatestResumableCheckpoint } from "./resolver.js";

type ResumeWorkInput = {
  workspaceId: string;
  taskKey?: string;
};

export type ResumeHandoff = {
  checkpointId: string;
  task: string;
  taskKey: string;
  status: CheckpointStatus;
  payload: CheckpointPayload;
  hydraMemoryIds: string[];
  updatedAt: Date;
};

/**
 * Produces a compact, provider-neutral handoff. The MCP layer can add
 * long-term HydraDB context using `hydraMemoryIds` in a later step.
 */
export async function resumeWork(input: ResumeWorkInput): Promise<ResumeHandoff | null> {
  const checkpoint = await findLatestResumableCheckpoint(input);

  if (!checkpoint) return null;

  return {
    checkpointId: checkpoint.id,
    task: checkpoint.task,
    taskKey: checkpoint.taskKey,
    status: checkpoint.status,
    payload: checkpoint.payload as CheckpointPayload,
    hydraMemoryIds: checkpoint.hydraMemoryIds,
    updatedAt: checkpoint.updatedAt,
  };
}

import { prisma } from "@repo/db";
import { parseCheckpointInput, type CheckpointInput } from "./schema.js";

/**
 * Stores an immutable handoff snapshot. Creating a new row, rather than
 * overwriting the prior checkpoint, preserves a task's operational history.
 */
export async function saveCheckpoint(input: CheckpointInput) {
  const checkpoint = parseCheckpointInput(input);

  return prisma.workingCheckpoint.create({
    data: {
      workspaceId: checkpoint.workspaceId,
      sessionId: checkpoint.sessionId,
      taskKey: checkpoint.taskKey,
      task: checkpoint.task,
      status: checkpoint.status,
      payload: checkpoint.payload,
      hydraMemoryIds: checkpoint.hydraMemoryIds,
    },
  });
}

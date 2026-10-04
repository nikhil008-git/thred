import { saveCheckpoint } from "@repo/working-memory";
import type { WorkingMemoryCheckpoint } from "@repo/memory-extractor";

/**
 * Writes the current-task handoff to Postgres. Long-term facts stay in HydraDB;
 * this row is what thread_resume reads.
 */
export async function saveWorkingMemoryHandoff(input: {
  workspaceId: string;
  sessionId: string;
  workingMemory: WorkingMemoryCheckpoint;
  hydraMemoryIds: string[];
}) {
  const { workingMemory } = input;
  return saveCheckpoint({
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    taskKey: workingMemory.taskKey,
    task: workingMemory.task,
    status: workingMemory.status,
    payload: {
      completed: workingMemory.completed,
      filesChanged: workingMemory.filesChanged,
      tests: workingMemory.tests,
      blockers: workingMemory.blockers,
      nextStep: workingMemory.nextStep,
    },
    hydraMemoryIds: input.hydraMemoryIds,
  });
}

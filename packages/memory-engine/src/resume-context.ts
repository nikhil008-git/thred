import { resumeWork, type ResumeHandoff } from "@repo/working-memory";
import { buildMemoryContext, type MemoryContext } from "./context-builder.js";

export type ResumeWithMemory = ResumeHandoff & { memoryContext: MemoryContext };

/** Restores operational state and evidence-backed durable context in one handoff. */
export async function resumeWithMemory(input: {
  workspaceId: string;
  taskKey?: string;
}): Promise<ResumeWithMemory | null> {
  const handoff = await resumeWork(input);
  if (!handoff) return null;

  const query = [handoff.task, handoff.payload.nextStep, ...handoff.payload.filesChanged]
    .filter(Boolean)
    .join(" ");
  const memoryContext = await buildMemoryContext({ workspaceId: input.workspaceId, query });
  return { ...handoff, memoryContext };
}

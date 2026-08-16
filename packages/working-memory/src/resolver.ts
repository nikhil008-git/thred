import { prisma } from "@repo/db";

type FindCheckpointInput = {
  workspaceId: string;
  taskKey?: string;
};

/** Returns the newest task snapshot that an agent can still act on. */
export async function findLatestResumableCheckpoint({
  workspaceId,
  taskKey,
}: FindCheckpointInput) {
  return prisma.workingCheckpoint.findFirst({
    where: {
      workspaceId,
      ...(taskKey ? { taskKey } : {}),
      status: { in: ["IN_PROGRESS", "BLOCKED"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

-- One owner per workspace instead of a members table nobody invites into.
ALTER TABLE "Workspace" ADD COLUMN "ownerId" TEXT;

UPDATE "Workspace" AS workspace
SET "ownerId" = (
  SELECT member."userId"
  FROM "WorkspaceMember" AS member
  WHERE member."workspaceId" = workspace."id"
  ORDER BY CASE WHEN member."role" = 'OWNER' THEN 0 ELSE 1 END, member."createdAt"
  LIMIT 1
);

DELETE FROM "Workspace" WHERE "ownerId" IS NULL;

ALTER TABLE "Workspace" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_workspaceId_fkey";
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_userId_fkey";
DROP TABLE "WorkspaceMember";
DROP TYPE "WorkspaceRole";

-- AgentConnection was never written.
ALTER TABLE "AgentSession" DROP CONSTRAINT "AgentSession_connectionId_fkey";
DROP INDEX "AgentSession_connectionId_idx";
ALTER TABLE "AgentSession" DROP COLUMN "connectionId";
DROP TABLE "AgentConnection";

-- EvidenceEvent was never written.
ALTER TABLE "EvidenceEvent" DROP CONSTRAINT "EvidenceEvent_workspaceId_fkey";
ALTER TABLE "EvidenceEvent" DROP CONSTRAINT "EvidenceEvent_sessionId_fkey";
DROP TABLE "EvidenceEvent";
DROP TYPE "EvidenceKind";

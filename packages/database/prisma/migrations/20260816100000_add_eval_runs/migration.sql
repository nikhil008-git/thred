-- CreateEnum
CREATE TYPE "EvalStrategy" AS ENUM ('VECTOR_RAG', 'THRED');

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "strategy" "EvalStrategy" NOT NULL,
    "answerModel" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalCaseResult" (
    "id" TEXT NOT NULL,
    "evalRunId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedAnswer" TEXT,
    "answer" TEXT,
    "shouldAbstain" BOOLEAN NOT NULL DEFAULT false,
    "abstained" BOOLEAN NOT NULL DEFAULT false,
    "answerCorrect" BOOLEAN,
    "temporalCorrect" BOOLEAN,
    "revisionCorrect" BOOLEAN,
    "abstentionCorrect" BOOLEAN,
    "writeTokens" INTEGER NOT NULL DEFAULT 0,
    "readTokens" INTEGER NOT NULL DEFAULT 0,
    "ingestLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "retrievalLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalCaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvalRun_workspaceId_dataset_startedAt_idx" ON "EvalRun"("workspaceId", "dataset", "startedAt");
CREATE UNIQUE INDEX "EvalCaseResult_evalRunId_caseId_key" ON "EvalCaseResult"("evalRunId", "caseId");
CREATE INDEX "EvalCaseResult_caseId_idx" ON "EvalCaseResult"("caseId");

-- AddForeignKey
ALTER TABLE "EvalRun" ADD CONSTRAINT "EvalRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvalCaseResult" ADD CONSTRAINT "EvalCaseResult_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "EvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

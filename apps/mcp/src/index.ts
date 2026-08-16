import { config } from "dotenv";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { prisma } from "@repo/db";
import {
  buildMemoryContext,
  buildMemoryHistory,
  HydraMemoryLookup,
  ingestSession,
  inspectMemory,
  processLongTermClaim,
  resumeWithMemory,
} from "@repo/memory-engine";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import * as z from "zod/v4";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(sourceDirectory, "../../../.env") });

async function getWorkspaceId(): Promise<string> {
  const secret = process.env.THRED_API_KEY?.trim();
  if (!secret) throw new Error("THRED_API_KEY is required");

  const keyHash = createHash("sha256").update(secret).digest("hex");
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, workspaceId: true },
  });
  if (!apiKey) throw new Error("THRED_API_KEY is invalid, revoked, or expired");

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });
  return apiKey.workspaceId;
}

async function getAgentSession(workspaceId: string, externalId: string): Promise<string> {
  const existing = await prisma.agentSession.findFirst({
    where: { workspaceId, externalId },
    select: { id: true },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return existing.id;

  const session = await prisma.agentSession.create({
    data: { workspaceId, externalId, agent: "CODEX" },
    select: { id: true },
  });
  return session.id;
}

function createServer() {
  const server = new McpServer({
    name: "thred",
    version: "0.1.0",
  });

  server.registerTool(
    "thread_context",
    {
      description: "Retrieve verified long-term project context from Thred.",
      inputSchema: z.object({
        query: z.string().min(1),
      }),
    },
    async ({ query }) => {
      const result = await buildMemoryContext({
        workspaceId: await getWorkspaceId(),
        query,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result),
        }],
      };
    },
  );

  server.registerTool(
    "thread_remember",
    {
      description: "Persist a provenance-backed durable fact or decision, preserving revisions.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
        kind: z.enum(["fact", "decision", "lesson", "architecture", "preference"]),
        subject: z.string().min(1),
        predicate: z.string().min(1),
        value: z.string().min(1),
        reason: z.string().min(1).optional(),
        confidence: z.number().min(0).max(1),
        sourceMessageIds: z.array(z.string().min(1)).min(1),
        files: z.array(z.string().min(1)).default([]),
        evidenceEventIds: z.array(z.string().min(1)).default([]),
      }),
    },
    async (input) => {
      const workspaceId = await getWorkspaceId();
      const sessionId = await getAgentSession(workspaceId, input.sessionId);
      const result = await processLongTermClaim(new HydraMemoryLookup(), {
        workspaceId,
        sessionId,
        evidenceEventIds: input.evidenceEventIds,
        claim: {
          kind: input.kind,
          subject: input.subject,
          predicate: input.predicate,
          value: input.value,
          ...(input.reason ? { reason: input.reason } : {}),
          confidence: input.confidence,
          sourceMessageIds: input.sourceMessageIds,
          files: input.files,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "thread_history",
    {
      description: "Show provenance-backed revisions for a memory or entity over time.",
      inputSchema: z.object({ query: z.string().min(1), maxResults: z.number().int().min(1).max(100).optional() }),
    },
    async ({ query, maxResults }) => {
      const result = await buildMemoryHistory({
        workspaceId: await getWorkspaceId(),
        query,
        ...(maxResults === undefined ? {} : { maxResults }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "thread_inspect",
    {
      description: "Inspect a memory's graph relationships and source provenance.",
      inputSchema: z.object({ memoryId: z.string().min(1) }),
    },
    async ({ memoryId }) => {
      const result = await inspectMemory({ workspaceId: await getWorkspaceId(), memoryId });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "thread_checkpoint",
    {
      description: "Save coding progress and extract durable long-term project memory.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
        messages: z.array(z.object({
          id: z.string().min(1),
          role: z.enum(["user", "assistant", "tool"]),
          content: z.string().min(1),
        })),
        changedFiles: z.array(z.string()).default([]),
        testResults: z.array(z.string()).default([]),
        evidenceReferences: z.array(z.string()).default([]),
        evidenceEventIds: z.array(z.string()).default([]),
      }),
    },
    async (input) => {
      const workspaceId = await getWorkspaceId();
      const sessionId = await getAgentSession(workspaceId, input.sessionId);
      const result = await ingestSession(
        {
          workspaceId,
          sessionId,
          evidenceEventIds: input.evidenceEventIds,
          extractionRequest: {
            messages: input.messages,
            changedFiles: input.changedFiles,
            testResults: input.testResults,
            evidenceReferences: input.evidenceReferences,
          },
        },
        { model: new OpenAIMemoryExtractionModel() },
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            checkpointId: result.checkpoint?.id ?? null,
            longTermDecisions: result.processed.map((item) => item.decision),
          }),
        }],
      };
    },
  );

  server.registerTool(
    "thread_resume",
    {
      description: "Restore the latest unfinished Thred coding checkpoint.",
      inputSchema: z.object({
        taskKey: z.string().min(1).optional(),
      }),
    },
    async ({ taskKey }) => {
      const handoff = await resumeWithMemory({
        workspaceId: await getWorkspaceId(),
        ...(taskKey ? { taskKey } : {}),
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            handoff ?? { status: "NOT_FOUND", message: "No resumable task found." },
          ),
        }],
      };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error("Thred MCP running on stdio");

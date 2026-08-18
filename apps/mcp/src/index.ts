#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const DEFAULT_API_URL = "http://localhost:8080";

function apiBaseUrl(): string {
  return (process.env.THRED_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

function apiKey(): string {
  const secret = process.env.THRED_API_KEY?.trim();
  if (!secret) throw new Error("THRED_API_KEY is required");
  return secret;
}

async function callMcp<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/api/mcp/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && payload.error
      ? payload.error
      : `Thred API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
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
      const result = await callMcp("context", { query });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
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
      const result = await callMcp("remember", input);
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
      const result = await callMcp("history", { query, ...(maxResults === undefined ? {} : { maxResults }) });
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
      const result = await callMcp("inspect", { memoryId });
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
        evidenceEventIds: z.array(z.string().min(1)).default([]),
      }),
    },
    async (input) => {
      const result = await callMcp("checkpoint", input);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
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
      const result = await callMcp("resume", taskKey ? { taskKey } : {});
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error("Thred MCP running on stdio");

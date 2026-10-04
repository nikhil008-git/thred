#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { callMcp } from "./client.js";

function createServer() {
  const server = new McpServer({
    name: "thred",
    version: "0.2.0",
  });

  server.registerTool(
    "thread_context",
    {
      description:
        "Retrieve verified long-term project context from Thred. Set includeHistory to get every revision of the matching facts, oldest first, including superseded ones.",
      inputSchema: z.object({
        query: z.string().min(1),
        includeHistory: z.boolean().optional(),
      }),
    },
    async ({ query, includeHistory }) => {
      const result = await callMcp("context", { query, includeHistory });
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
      const result = await callMcp("resume", { taskKey });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error("Thred MCP running on stdio");

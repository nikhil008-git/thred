import { Router } from "express";
import {
  buildMemoryContext,
  buildMemoryHistory,
  CachedMemoryLookup,
  HydraMemoryLookup,
  ingestSession,
  resumeWithMemory,
} from "@repo/memory-engine";
import { extractionModelForWorkspace } from "./workspace-model.js";
import { getAgentSession, requireThredApiKey, type ThredRequest } from "./mcp-auth.js";

export const mcpRouter = Router();

mcpRouter.use(requireThredApiKey);

mcpRouter.post("/context", async (req: ThredRequest, res, next) => {
  try {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query) return res.status(400).json({ error: "query is required" });

    // History keeps superseded revisions and orders them oldest first; plain
    // context hides them and returns only what is current.
    const result = req.body?.includeHistory === true
      ? await buildMemoryHistory({ workspaceId: req.workspaceId!, query })
      : await buildMemoryContext({ workspaceId: req.workspaceId!, query });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/checkpoint", async (req: ThredRequest, res, next) => {
  try {
    const body = req.body ?? {};
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const changedFiles = Array.isArray(body.changedFiles) ? body.changedFiles : [];
    const testResults = Array.isArray(body.testResults) ? body.testResults : [];
    const evidenceReferences = Array.isArray(body.evidenceReferences) ? body.evidenceReferences : [];
    const evidenceEventIds = Array.isArray(body.evidenceEventIds) ? body.evidenceEventIds : [];

    if (!sessionId || !messages.length) {
      return res.status(400).json({ error: "sessionId and messages are required" });
    }

    const workspaceId = req.workspaceId!;
    const [agentSessionId, model] = await Promise.all([
      getAgentSession(workspaceId, sessionId),
      extractionModelForWorkspace(workspaceId),
    ]);
    const result = await ingestSession(
      {
        workspaceId,
        sessionId: agentSessionId,
        evidenceEventIds,
        extractionRequest: {
          messages,
          changedFiles,
          testResults,
          evidenceReferences,
        },
      },
      { model, memoryLookup: new CachedMemoryLookup(new HydraMemoryLookup()) },
    );

    const noHandoffMessage =
      "Long-term memories were extracted, but no resumable working-memory handoff was detected in this session.";
    res.json({
      checkpointId: result.checkpoint?.id ?? null,
      checkpointStatus: result.checkpoint ? "SAVED" : "NO_WORKING_MEMORY",
      message: result.checkpoint ? undefined : noHandoffMessage,
      longTermDecisions: result.processed.map((item) => item.decision),
    });
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/resume", async (req: ThredRequest, res, next) => {
  try {
    const taskKey = typeof req.body?.taskKey === "string" ? req.body.taskKey.trim() : "";
    const handoff = await resumeWithMemory({
      workspaceId: req.workspaceId!,
      taskKey: taskKey || undefined,
    });
    res.json(handoff ?? { status: "NOT_FOUND", message: "No resumable task found." });
  } catch (error) {
    next(error);
  }
});

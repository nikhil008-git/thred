import { Router } from "express";
import {
  buildMemoryContext,
  buildMemoryHistory,
  CachedMemoryLookup,
  HydraMemoryLookup,
  ingestSession,
  inspectMemory,
  processLongTermClaim,
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

    const result = await buildMemoryContext({
      workspaceId: req.workspaceId!,
      query,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/remember", async (req: ThredRequest, res, next) => {
  try {
    const body = req.body ?? {};
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const kind = body.kind;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const predicate = typeof body.predicate === "string" ? body.predicate.trim() : "";
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;
    const confidence = body.confidence;
    const sourceMessageIds = Array.isArray(body.sourceMessageIds) ? body.sourceMessageIds : [];
    const files = Array.isArray(body.files) ? body.files : [];
    const evidenceEventIds = Array.isArray(body.evidenceEventIds) ? body.evidenceEventIds : [];

    if (!sessionId || !subject || !predicate || !value || typeof confidence !== "number"
      || !sourceMessageIds.length) {
      return res.status(400).json({ error: "Invalid remember payload" });
    }

    const workspaceId = req.workspaceId!;
    const agentSessionId = await getAgentSession(workspaceId, sessionId);
    const result = await processLongTermClaim(new HydraMemoryLookup(), {
      workspaceId,
      sessionId: agentSessionId,
      evidenceEventIds,
      claim: {
        kind,
        subject,
        predicate,
        value,
        ...(reason ? { reason } : {}),
        confidence,
        sourceMessageIds,
        files,
      },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/history", async (req: ThredRequest, res, next) => {
  try {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    const maxResults = typeof req.body?.maxResults === "number" ? req.body.maxResults : undefined;
    if (!query) return res.status(400).json({ error: "query is required" });

    const result = await buildMemoryHistory({
      workspaceId: req.workspaceId!,
      query,
      ...(maxResults === undefined ? {} : { maxResults }),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/inspect", async (req: ThredRequest, res, next) => {
  try {
    const memoryId = typeof req.body?.memoryId === "string" ? req.body.memoryId.trim() : "";
    if (!memoryId) return res.status(400).json({ error: "memoryId is required" });

    const result = await inspectMemory({ workspaceId: req.workspaceId!, memoryId });
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
    const agentSessionId = await getAgentSession(workspaceId, sessionId);
    const model = await extractionModelForWorkspace(workspaceId);
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

    res.json({
      checkpointId: result.checkpoint?.id ?? null,
      longTermDecisions: result.processed.map((item) => item.decision),
    });
  } catch (error) {
    next(error);
  }
});

mcpRouter.post("/resume", async (req: ThredRequest, res, next) => {
  try {
    const taskKey = typeof req.body?.taskKey === "string" ? req.body.taskKey.trim() : undefined;
    const handoff = await resumeWithMemory({
      workspaceId: req.workspaceId!,
      ...(taskKey ? { taskKey } : {}),
    });
    res.json(handoff ?? { status: "NOT_FOUND", message: "No resumable task found." });
  } catch (error) {
    next(error);
  }
});

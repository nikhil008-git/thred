
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { prisma } from "@repo/db";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const authUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

type AuthenticatedRequest = Request & {
    user?: { id: string; email: string; name: string };
};

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", frontendOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/**
 * Lightweight per-process protection for the public API. For multi-instance
 * deployments, replace this Map with a shared store (such as Redis).
 */
app.use("/api", (req, res, next) => {
    const now = Date.now();
    const client = req.ip || req.socket.remoteAddress || "unknown";
    const current = rateLimitBuckets.get(client);
    const bucket = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + rateLimitWindowMs }
        : current;

    bucket.count += 1;
    rateLimitBuckets.set(client, bucket);

    if (rateLimitBuckets.size > 10_000) {
        for (const [key, entry] of rateLimitBuckets) {
            if (entry.resetAt <= now) rateLimitBuckets.delete(key);
        }
    }

    res.setHeader("X-RateLimit-Limit", rateLimitMaxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, rateLimitMaxRequests - bucket.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > rateLimitMaxRequests) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
        return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }
    next();
});

/** Validates the Better Auth session cookie before protected API handlers run. */
async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) {
    try {
        const sessionResponse = await fetch(`${authUrl}/api/auth/get-session`, {
            headers: req.headers.cookie ? { cookie: req.headers.cookie } : {},
        });
        const session = (await sessionResponse.json()) as {
            user?: { id: string; email: string; name: string };
        } | null;

        if (!sessionResponse.ok || !session?.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        req.user = session.user;
        next();
    } catch (error) {
        next(error);
    }
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
});

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

async function workspaceForUser(userId: string, slug: string) {
    return prisma.workspace.findFirst({
        where: { slug, members: { some: { userId } } },
    });
}

/** Lists workspaces the signed-in person can open in the product. */
app.get("/api/workspaces", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const workspaces = await prisma.workspace.findMany({
            where: { members: { some: { userId: req.user!.id } } },
            select: { id: true, name: true, slug: true, createdAt: true },
            orderBy: { updatedAt: "desc" },
        });
        res.json({ workspaces });
    } catch (error) { next(error); }
});

/** Creates the first/minimal workspace and gives its creator ownership. */
app.post("/api/workspaces", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        if (!name) return res.status(400).json({ error: "Workspace name is required" });
        const base = slugify(name) || "workspace";
        let slug = base;
        let attempt = 2;
        while (await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${attempt++}`;
        const workspace = await prisma.workspace.create({
            data: { name, slug, members: { create: { userId: req.user!.id, role: "OWNER" } } },
            select: { id: true, name: true, slug: true },
        });
        res.status(201).json({ workspace });
    } catch (error) { next(error); }
});

/** Dashboard data stays operational: checkpoints/evidence/evals live in Postgres; durable memory remains in HydraDB. */
app.get("/api/workspaces/:slug/overview", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        if (!slug) return res.status(400).json({ error: "Workspace slug is required" });
        const workspace = await workspaceForUser(req.user!.id, slug);
        if (!workspace) return res.status(404).json({ error: "Workspace not found" });
        const [sessionCount, checkpointCount, evidenceCount, latestCheckpoints, latestEvidence, latestEvals] = await Promise.all([
            prisma.agentSession.count({ where: { workspaceId: workspace.id } }),
            prisma.workingCheckpoint.count({ where: { workspaceId: workspace.id } }),
            prisma.evidenceEvent.count({ where: { workspaceId: workspace.id } }),
            prisma.workingCheckpoint.findMany({ where: { workspaceId: workspace.id }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, task: true, status: true, updatedAt: true, payload: true } }),
            prisma.evidenceEvent.findMany({ where: { workspaceId: workspace.id }, orderBy: { occurredAt: "desc" }, take: 5, select: { id: true, title: true, kind: true, occurredAt: true } }),
            prisma.evalRun.findMany({ where: { workspaceId: workspace.id }, orderBy: { startedAt: "desc" }, take: 3, select: { id: true, dataset: true, strategy: true, startedAt: true, completedAt: true, _count: { select: { results: true } } } }),
        ]);
        res.json({ workspace, metrics: { sessionCount, checkpointCount, evidenceCount }, latestCheckpoints, latestEvidence, latestEvals });
    } catch (error) { next(error); }
});

/** Lists only safe API-key metadata. The secret is returned exactly once at creation. */
app.get("/api/workspaces/:slug/api-keys", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        if (!slug) return res.status(400).json({ error: "Workspace slug is required" });
        const workspace = await workspaceForUser(req.user!.id, slug);
        if (!workspace) return res.status(404).json({ error: "Workspace not found" });
        const apiKeys = await prisma.apiKey.findMany({
            where: { workspaceId: workspace.id },
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
        });
        res.json({ apiKeys });
    } catch (error) { next(error); }
});

/** Creates a workspace-scoped MCP key. Persist only its SHA-256 hash. */
app.post("/api/workspaces/:slug/api-keys", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        if (!slug) return res.status(400).json({ error: "Workspace slug is required" });
        const workspace = await workspaceForUser(req.user!.id, slug);
        if (!workspace) return res.status(404).json({ error: "Workspace not found" });
        const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim().slice(0, 80) : "MCP key";
        const secret = `thrd_sk_${randomBytes(24).toString("base64url")}`;
        const apiKey = await prisma.apiKey.create({
            data: {
                workspaceId: workspace.id,
                name,
                keyPrefix: secret.slice(0, 15),
                keyHash: createHash("sha256").update(secret).digest("hex"),
            },
            select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
        });
        res.status(201).json({ apiKey, secret });
    } catch (error) { next(error); }
});

/** Revocation is reversible only by issuing a replacement key. */
app.post("/api/workspaces/:slug/api-keys/:keyId/revoke", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        const keyId = Array.isArray(req.params.keyId) ? req.params.keyId[0] : req.params.keyId;
        if (!slug || !keyId) return res.status(400).json({ error: "Workspace slug and key ID are required" });
        const workspace = await workspaceForUser(req.user!.id, slug);
        if (!workspace) return res.status(404).json({ error: "Workspace not found" });
        const key = await prisma.apiKey.findFirst({ where: { id: keyId, workspaceId: workspace.id } });
        if (!key) return res.status(404).json({ error: "API key not found" });
        await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
        res.json({ ok: true });
    } catch (error) { next(error); }
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});

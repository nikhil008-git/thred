import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspace = await prisma.workspace.findFirst({ where: { slug, members: { some: { userId: session.user.id } } } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const [agentCount, checkpointCount, latestSessions, latestCheckpoints] = await Promise.all([
    prisma.agentSession.count({ where: { workspaceId: workspace.id } }),
    prisma.workingCheckpoint.count({ where: { workspaceId: workspace.id, status: { in: ["IN_PROGRESS", "BLOCKED"] } } }),
    prisma.agentSession.findMany({ where: { workspaceId: workspace.id }, orderBy: { startedAt: "desc" }, take: 3, select: { id: true, agent: true, startedAt: true, endedAt: true } }),
    prisma.workingCheckpoint.findMany({ where: { workspaceId: workspace.id, status: { in: ["IN_PROGRESS", "BLOCKED"] } }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, task: true, status: true, updatedAt: true, payload: true, session: { select: { agent: true } } } }),
  ]);
  return NextResponse.json({ metrics: { agentCount, checkpointCount }, latestSessions, latestCheckpoints });
}

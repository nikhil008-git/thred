import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

async function workspaceForRequest(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return prisma.workspace.findFirst({ where: { slug, members: { some: { userId: session.user.id } } } });
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const workspace = await workspaceForRequest(slug);
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  return NextResponse.json({ apiKeys });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const workspace = await workspaceForRequest(slug);
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "MCP key";
  const secret = `thrd_sk_${randomBytes(24).toString("base64url")}`;
  const apiKey = await prisma.apiKey.create({
    data: { workspaceId: workspace.id, name, keyPrefix: secret.slice(0, 15), keyHash: createHash("sha256").update(secret).digest("hex") },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  return NextResponse.json({ apiKey, secret }, { status: 201 });
}

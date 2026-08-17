import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    select: { id: true, name: true, slug: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ workspaces });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  const base = slugify(name) || "workspace";
  let slug = base;
  let attempt = 2;
  while (await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${attempt++}`;
  const workspace = await prisma.workspace.create({
    data: { name, slug, members: { create: { userId: user.id, role: "OWNER" } } },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ workspace }, { status: 201 });
}

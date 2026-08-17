import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

type Context = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Use a workspace name between 1 and 80 characters." }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { slug, members: { some: { userId: session.user.id } } },
    select: { id: true },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: { name },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ workspace: updated });
}

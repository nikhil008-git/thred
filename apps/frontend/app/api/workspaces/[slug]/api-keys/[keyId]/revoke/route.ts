import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

export async function POST(_request: Request, context: { params: Promise<{ slug: string; keyId: string }> }) {
  const { slug, keyId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, workspace: { slug, members: { some: { userId: session.user.id } } } },
  });
  if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });
  await prisma.apiKey.delete({ where: { id: key.id } });
  return NextResponse.json({ ok: true });
}

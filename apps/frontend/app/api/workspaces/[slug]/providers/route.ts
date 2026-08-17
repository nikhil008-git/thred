import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";

const providers = new Set(["openai", "groq", "xai", "openrouter", "ollama", "custom"]);

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

function decrypt(value: string) {
  const [iv, ciphertext, tag] = value.split(".").map((part) => Buffer.from(part!, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(ciphertext!), decipher.final()]).toString("utf8");
}

async function workspaceForRequest(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return prisma.workspace.findFirst({ where: { slug, members: { some: { userId: session.user.id } } }, select: { id: true } });
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const workspace = await workspaceForRequest((await context.params).slug);
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const credentials = await prisma.providerCredential.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, provider: true, label: true, model: true, baseUrl: true, keyHint: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ providers: credentials });
}

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const workspace = await workspaceForRequest((await context.params).slug);
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : provider;
  const baseUrl = typeof body?.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl.trim().replace(/\/$/, "") : null;
  if (!providers.has(provider) || !model || (!["custom", "ollama"].includes(provider) && !key)) {
    return NextResponse.json({ error: "Provider, model, and API key are required (except Ollama/custom local endpoints)." }, { status: 400 });
  }
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) return NextResponse.json({ error: "Base URL must start with http:// or https://" }, { status: 400 });
  const saved = await prisma.providerCredential.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
    create: { workspaceId: workspace.id, provider, label, model, baseUrl, encryptedKey: encrypt(key || "local"), keyHint: key ? `…${key.slice(-4)}` : "local" },
    update: { label, model, baseUrl, ...(key ? { encryptedKey: encrypt(key), keyHint: `…${key.slice(-4)}` } : {}) },
    select: { id: true, provider: true, label: true, model: true, baseUrl: true, keyHint: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ provider: saved });
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const workspace = await workspaceForRequest((await context.params).slug);
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider")?.trim().toLowerCase();
  if (!provider || !providers.has(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  await prisma.providerCredential.deleteMany({ where: { workspaceId: workspace.id, provider } });
  return NextResponse.json({ ok: true });
}

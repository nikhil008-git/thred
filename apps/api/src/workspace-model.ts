import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { prisma } from "@repo/db";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import type { MemoryExtractionModel } from "@repo/memory-extractor";

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

function decrypt(value: string) {
  const [ivPart, ciphertextPart, tagPart] = value.split(".");
  if (!ivPart || !ciphertextPart || !tagPart) throw new Error("Invalid encrypted provider key");
  const iv = Buffer.from(ivPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function extractionModelForWorkspace(workspaceId: string): Promise<MemoryExtractionModel> {
  const credential = await prisma.providerCredential.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: { provider: true, model: true, baseUrl: true, encryptedKey: true },
  });

  if (!credential) return new OpenAIMemoryExtractionModel();

  const apiKey = decrypt(credential.encryptedKey);
  return new OpenAIMemoryExtractionModel({
    provider: credential.provider,
    model: credential.model,
    ...(credential.baseUrl ? { baseURL: credential.baseUrl } : {}),
    ...(apiKey !== "local" ? { apiKey } : {}),
  });
}

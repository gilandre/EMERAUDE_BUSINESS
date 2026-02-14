/**
 * Gestion des API Keys pour accès externe.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const KEY_PREFIX = "eb_";
const KEY_LENGTH = 32;

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(KEY_LENGTH).toString("hex");
  const key = `${KEY_PREFIX}${raw}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

export async function createApiKey(
  name: string,
  scopes: string[],
  expireAt?: Date
): Promise<{ id: string; key: string; name: string }> {
  const { key, hash, prefix } = generateApiKey();
  const record = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      expireAt,
    },
  });
  logger.info("ApiKey created", { apiKeyId: record.id, name });
  return { id: record.id, key, name: record.name };
}

export async function validateApiKey(
  key: string
): Promise<{ id: string; scopes: string[] } | null> {
  if (!key.startsWith(KEY_PREFIX)) return null;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 8);
  const record = await prisma.apiKey.findFirst({
    where: {
      keyHash: hash,
      keyPrefix: prefix,
      active: true,
      OR: [
        { expireAt: null },
        { expireAt: { gt: new Date() } },
      ],
    },
  });
  return record ? { id: record.id, scopes: record.scopes } : null;
}

export async function recordApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  ipAddress?: string
) {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: new Date() },
  });
  await prisma.apiKeyUsage.create({
    data: { apiKeyId, endpoint, method, ipAddress },
  });
}

export function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes("*")) return true;
  return scopes.some((s) => s === required || s.startsWith(required.split(":")[0] + ":"));
}

/**
 * Middleware pour authentification par API Key (accès externe).
 */

import { NextResponse } from "next/server";
import { validateApiKey, recordApiKeyUsage, hasScope } from "./api-keys";
import { getClientIdentifier } from "./rate-limit";

export async function authenticateApiKey(
  request: Request,
  requiredScope: string
): Promise<{ apiKeyId: string; scopes: string[] } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API Key requise (header Authorization: Bearer ou X-API-Key)" },
      { status: 401 }
    );
  }

  const result = await validateApiKey(apiKey);
  if (!result) {
    return NextResponse.json({ error: "API Key invalide ou expirée" }, { status: 401 });
  }

  if (!hasScope(result.scopes, requiredScope)) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  const ip = getClientIdentifier(request);
  await recordApiKeyUsage(result.id, new URL(request.url).pathname, request.method, ip);

  return { apiKeyId: result.id, scopes: result.scopes };
}

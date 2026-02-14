/**
 * Wrapper combinant rate limiting et validation pour les routes API.
 */

import { NextResponse } from "next/server";
import { consumeRateLimit } from "./rate-limit";
import { validateCsrf } from "./csrf";

export type SecurityOptions = {
  /** Exiger un token CSRF valide (pour POST/PUT/DELETE) */
  requireCsrf?: boolean;
  /** Exclure du rate limit (ex: health, metrics) */
  skipRateLimit?: boolean;
};

export async function withApiSecurity(
  request: Request,
  options: SecurityOptions = {}
): Promise<Response | null> {
  const { requireCsrf = false, skipRateLimit = false } = options;

  if (!skipRateLimit) {
    const rateLimitResponse = await consumeRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  if (requireCsrf && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const valid = await validateCsrf(request);
    if (!valid) {
      return NextResponse.json(
        { error: "Token CSRF invalide ou manquant" },
        { status: 403 }
      );
    }
  }

  return null;
}

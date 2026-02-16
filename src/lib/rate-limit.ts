/**
 * Rate limiting basé sur Redis pour Next.js API routes.
 * Pas d'express-rate-limit car Next.js n'utilise pas Express.
 */

import redis from "./redis";

const PREFIX = "emeraude:ratelimit:";

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

const CONFIGS: Record<string, RateLimitConfig> = {
  "api/auth": { windowMs: 15 * 60 * 1000, max: 15 },
  "api/alertes/trigger": { windowMs: 60 * 1000, max: 10 },
  "api/alertes/test": { windowMs: 60 * 1000, max: 10 },
  "api/default": { windowMs: 15 * 60 * 1000, max: 100 },
};

// Routes that should not be rate-limited (read-only auth endpoints used by NextAuth internally)
const RATE_LIMIT_EXEMPT = ["/api/auth/csrf", "/api/auth/providers", "/api/auth/session"];

function getConfig(pathname: string): RateLimitConfig | null {
  if (RATE_LIMIT_EXEMPT.includes(pathname)) return null;
  if (pathname.startsWith("/api/auth")) return CONFIGS["api/auth"];
  if (pathname.includes("/api/alertes/trigger") || pathname.includes("/api/alertes/test"))
    return CONFIGS["api/alertes/trigger"];
  return CONFIGS["api/default"];
}

export function getClientIdentifier(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = cf || forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

export async function checkRateLimit(
  request: Request,
  pathname?: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const path = pathname ?? new URL(request.url).pathname;
  const config = getConfig(path);
  if (!config) return { success: true, remaining: Infinity, reset: 0 };
  const identifier = getClientIdentifier(request);
  const key = `${PREFIX}${path}:${identifier}`;

  try {
    const now = Date.now();
    const count = await redis.incr(key);
    let ttlMs = await redis.pttl(key);

    if (ttlMs === -1) {
      await redis.pexpire(key, config.windowMs);
      ttlMs = config.windowMs;
    }

    const remaining = Math.max(0, config.max - count);
    const reset = now + ttlMs;

    return {
      success: count <= config.max,
      remaining,
      reset,
    };
  } catch {
    return { success: true, remaining: config.max, reset: Date.now() };
  }
}

export async function consumeRateLimit(request: Request): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const result = await checkRateLimit(request, pathname);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Trop de requêtes, réessayez plus tard",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  }
  return null;
}

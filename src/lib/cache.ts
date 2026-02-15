/**
 * Cache Redis avec TTL - utilisé pour permissions, menus, dashboard, config.
 * En cas d'erreur Redis, on dégrade gracieusement (pas de cache).
 */

import redis from "./redis";
import { cacheHitsTotal, cacheMissesTotal } from "./metrics";

const PREFIX = "emeraude:";

function getKeyPrefix(key: string): string {
  const parts = key.split(":");
  return parts[0] || "default";
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(PREFIX + key);
    if (raw == null) {
      cacheMissesTotal.inc({ key_prefix: getKeyPrefix(key) });
      return null;
    }
    cacheHitsTotal.inc({ key_prefix: getKeyPrefix(key) });
    return JSON.parse(raw) as T;
  } catch {
    cacheMissesTotal.inc({ key_prefix: getKeyPrefix(key) });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.setex(
      PREFIX + key,
      ttlSeconds,
      JSON.stringify(value)
    );
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Supprime toutes les clés correspondant au préfixe (ex: "menus") */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  try {
    const pattern = PREFIX + prefix + "*";
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // ignore
  }
}

/** TTL en secondes */
export const CACHE_TTL = {
  PERMISSIONS: 3600,      // 1h
  MENUS: 1800,           // 30min
  DASHBOARD: 300,        // 5min
  CONFIG: 3600,          // 1h
  MARCHES_LIST: 120,     // 2min
  DEVISES: 1800,         // 30min
  PROFILS: 600,          // 10min
  USERS_LIST: 60,        // 1min
} as const;

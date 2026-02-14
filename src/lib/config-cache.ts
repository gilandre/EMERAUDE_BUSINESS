/**
 * Configuration système avec cache Redis (TTL: 1h).
 * Utiliser depuis une route API ou un service qui a besoin des configs.
 */

import { prisma } from "./prisma";
import { cacheGet, cacheSet, CACHE_TTL } from "./cache";

const CONFIG_CACHE_KEY = "config:all";

export interface ConfigEntry {
  cle: string;
  valeur: string;
  type: string;
  module: string | null;
}

export async function getCachedConfig(): Promise<ConfigEntry[]> {
  const cached = await cacheGet<ConfigEntry[]>(CONFIG_CACHE_KEY);
  if (cached) return cached;

  const rows = await prisma.config.findMany({
    select: { cle: true, valeur: true, type: true, module: true },
  });
  const result = rows.map((r) => ({
    cle: r.cle,
    valeur: r.valeur,
    type: r.type,
    module: r.module,
  }));
  await cacheSet(CONFIG_CACHE_KEY, result, CACHE_TTL.CONFIG);
  return result;
}

export async function getCachedConfigMap(): Promise<Record<string, string>> {
  const list = await getCachedConfig();
  return Object.fromEntries(list.map((c) => [c.cle, c.valeur]));
}

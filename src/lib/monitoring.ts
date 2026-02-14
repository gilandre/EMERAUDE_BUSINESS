/**
 * Utilitaires pour le monitoring - métriques réelles des environnements
 */
import redis from "./redis";
import { prisma } from "./prisma";

function parseRedisInfo(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("#") || !line.includes(":")) continue;
    const [k, v] = line.split(":", 2);
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

export async function getRedisInfo(): Promise<{
  status: "up" | "down";
  usedMemoryMb?: number;
  usedMemoryRssMb?: number;
  keysCount?: number;
  connectedClients?: number;
  uptimeSeconds?: number;
}> {
  try {
    const info = await redis.info();
    const parsed = parseRedisInfo(info);

    const usedMemory = parseInt(parsed.used_memory ?? "0", 10);
    const usedMemoryRss = parseInt(parsed.used_memory_rss ?? "0", 10);
    const connectedClients = parseInt(parsed.connected_clients ?? "0", 10);
    const uptimeSeconds = parseInt(parsed.uptime_in_seconds ?? "0", 10);

    let keysCount = 0;
    try {
      keysCount = await redis.dbsize();
    } catch {
      // fallback: parse keyspace from info
      for (const v of Object.values(parsed)) {
        const m = String(v).match(/keys=(\d+)/);
        if (m) keysCount += parseInt(m[1], 10);
      }
    }

    return {
      status: "up",
      usedMemoryMb: Math.round(usedMemory / 1024 / 1024),
      usedMemoryRssMb: Math.round(usedMemoryRss / 1024 / 1024),
      keysCount,
      connectedClients,
      uptimeSeconds,
    };
  } catch {
    return { status: "down" };
  }
}

export async function getActiveSessionsCount(): Promise<number> {
  try {
    const count = await prisma.session.count({
      where: { expires: { gt: new Date() } },
    });
    return count;
  } catch {
    return 0;
  }
}

export async function getDbStats(): Promise<{
  sessionsCount: number;
  usersCount: number;
  marchesCount: number;
}> {
  try {
    const [sessionsCount, usersCount, marchesCount] = await Promise.all([
      prisma.session.count({ where: { expires: { gt: new Date() } } }),
      prisma.user.count({ where: { active: true } }),
      prisma.marche.count({ where: { statut: "actif" } }),
    ]);
    return { sessionsCount, usersCount, marchesCount };
  } catch {
    return { sessionsCount: 0, usersCount: 0, marchesCount: 0 };
  }
}

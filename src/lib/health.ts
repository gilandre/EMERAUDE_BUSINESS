import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import checkDiskSpace from "check-disk-space";

const startTime = Date.now();

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up", responseTime: Date.now() - start };
  } catch {
    return { status: "down", responseTime: Date.now() - start };
  }
}

async function checkRedis() {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: "up", responseTime: Date.now() - start };
  } catch {
    return { status: "down", responseTime: Date.now() - start };
  }
}

async function checkDisk() {
  try {
    const { free, size } = await checkDiskSpace(process.platform === "win32" ? "C:" : "/");
    const usage = size > 0 ? Math.round(((size - free) / size) * 100) : 0;
    return { status: usage < 90 ? "healthy" : "warning", usage };
  } catch {
    return { status: "unknown" };
  }
}

function checkMemory() {
  try {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    const usage = total > 0 ? Math.round((used / total) * 100) : 0;
    return { status: usage < 90 ? "healthy" : "warning", usage };
  } catch {
    return { status: "unknown" };
  }
}

function getUptime() {
  return Math.floor((Date.now() - startTime) / 1000);
}

export async function runHealthChecks() {
  const [database, redisCheck, disk] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkDisk(),
  ]);
  const memory = checkMemory();
  const uptime = getUptime();

  const allHealthy =
    database.status === "up" &&
    redisCheck.status === "up" &&
    (disk.status === "healthy" || disk.status === "unknown") &&
    (memory.status === "healthy" || memory.status === "unknown");

  return {
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database,
      redis: redisCheck,
      disk,
      memory,
    },
  };
}

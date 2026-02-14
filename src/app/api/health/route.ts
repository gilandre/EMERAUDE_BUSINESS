import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import os from "os";
import checkDiskSpace from "check-disk-space";
import { withApiMetrics, type RouteContext } from "@/lib/api-metrics";

const startTime = Date.now();

async function checkDatabase(): Promise<{ status: string; responseTime?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up", responseTime: Date.now() - start };
  } catch {
    return { status: "down", responseTime: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: string; responseTime?: number }> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: "up", responseTime: Date.now() - start };
  } catch {
    return { status: "down", responseTime: Date.now() - start };
  }
}

async function checkDisk(): Promise<{ status: string; usage?: number }> {
  try {
    const { free, size } = await checkDiskSpace(process.platform === "win32" ? "C:" : "/");
    const usage = size > 0 ? Math.round(((size - free) / size) * 100) : 0;
    const isHealthy = usage < 90;
    return { status: isHealthy ? "healthy" : "warning", usage };
  } catch {
    return { status: "unknown" };
  }
}

function checkMemory(): { status: string; usage?: number } {
  try {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    const usage = total > 0 ? Math.round((used / total) * 100) : 0;
    const isHealthy = usage < 90;
    return { status: isHealthy ? "healthy" : "warning", usage };
  } catch {
    return { status: "unknown" };
  }
}

function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

async function getHandler(_req: Request, _ctx: RouteContext) {
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

  return NextResponse.json({
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database,
      redis: redisCheck,
      disk,
      memory,
    },
  });
}

export const GET = withApiMetrics(getHandler, "api/health", { skipRateLimit: true });

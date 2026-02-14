import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { withApiMetrics, type RouteContext } from "@/lib/api-metrics";
import { getMetricsSnapshot } from "@/lib/metrics";
import { getRedisInfo, getActiveSessionsCount } from "@/lib/monitoring";

async function getHandler(_req: Request, _ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "monitoring:read");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    healthRes,
    alertes,
    recentAudit,
    marcheStats,
    metricsSnapshot,
    redisInfo,
    activeSessionsCount,
  ] = await Promise.all([
    import("@/lib/health").then((m) => m.runHealthChecks()),
    prisma.alerte.findMany({
      where: { active: true },
      select: { id: true, code: true, libelle: true },
    }),
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.marche.aggregate({
      where: { statut: "actif" },
      _count: true,
      _sum: { montantTotalXOF: true, montantTotal: true },
    }),
    getMetricsSnapshot(),
    getRedisInfo(),
    getActiveSessionsCount(),
  ]);

  return NextResponse.json({
    health: healthRes,
    metrics: {
      ...metricsSnapshot,
      activeUsers: activeSessionsCount > 0 ? activeSessionsCount : metricsSnapshot.activeUsers,
    },
    redis: redisInfo,
    alertes,
    recentLogs: recentAudit,
    marcheStats: {
      count: marcheStats._count,
      totalMontantXOF: Number(marcheStats._sum.montantTotalXOF ?? marcheStats._sum.montantTotal ?? 0),
    },
  });
}

export const GET = withApiMetrics(getHandler, "api/monitoring");

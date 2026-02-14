import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/alertes/historique - Historique des notifications (exécutions d'alertes)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "alertes:read");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const alerteId = searchParams.get("alerteId");
  const canal = searchParams.get("canal");
  const envoyee = searchParams.get("envoyee");
  const marcheId = searchParams.get("marcheId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const skip = (page - 1) * pageSize;

  const where: { alerteId?: string; canal?: string; envoyee?: boolean; marcheId?: string } = {};
  if (alerteId) where.alerteId = alerteId;
  if (canal) where.canal = canal;
  if (marcheId) where.marcheId = marcheId;
  if (envoyee !== null && envoyee !== undefined && envoyee !== "") {
    where.envoyee = envoyee === "true";
  }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        alerte: {
          select: { id: true, code: true, libelle: true },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

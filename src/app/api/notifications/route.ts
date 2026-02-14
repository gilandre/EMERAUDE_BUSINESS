import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/notifications - Liste des notifications avec filtres et pagination
 * Query: limit, cursor, lu (true|false|all), type (alerte code)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const luParam = searchParams.get("lu");
  const type = searchParams.get("type");
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const cursor = searchParams.get("cursor");

  const where: { userId: string; lu?: boolean; alerte?: { code: string } } = {
    userId: session.user.id,
  };
  if (luParam === "true") where.lu = true;
  else if (luParam === "false") where.lu = false;
  if (type) where.alerte = { code: type };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      alerte: {
        select: { id: true, code: true, libelle: true },
      },
    },
  });

  const hasMore = notifications.length > limit;
  const data = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, lu: false },
  });

  return NextResponse.json({
    data: data.map((n) => ({
      id: n.id,
      sujet: n.sujet,
      corps: n.corps,
      lu: n.lu,
      luAt: n.luAt,
      createdAt: n.createdAt,
      alerte: n.alerte,
      type: n.alerte?.code ?? "unknown",
    })),
    unreadCount,
    nextCursor,
    hasMore,
  });
}

/**
 * PATCH /api/notifications - Marquer toutes comme lues
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { markAllRead } = body;

  if (markAllRead === true) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, lu: false },
      data: { lu: true, luAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}

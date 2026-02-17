import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "users:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    // Delete a single session
    const target = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!target) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }
    await prisma.session.delete({ where: { id: sessionId } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "Session",
        entityId: sessionId,
        ipAddress: getRequestIp(request) ?? undefined,
        description: `Session révoquée pour l'utilisateur ${userId}`,
      },
    });

    return NextResponse.json({ success: true });
  }

  // Delete all sessions for this user
  const deleted = await prisma.session.deleteMany({ where: { userId } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Session",
      entityId: userId,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Toutes les sessions révoquées (${deleted.count}) pour l'utilisateur ${userId}`,
    },
  });

  return NextResponse.json({ success: true, count: deleted.count });
}

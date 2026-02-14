import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id] - Marquer comme lu (body: { lu: true })
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { lu } = body;

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
  }

  if (lu === true) {
    await prisma.notification.update({
      where: { id },
      data: { lu: true, luAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, lu: !!lu });
}

/**
 * DELETE /api/notifications/[id] - Supprimer une notification
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
  }

  await prisma.notification.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

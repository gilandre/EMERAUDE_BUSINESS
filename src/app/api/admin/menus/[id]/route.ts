import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { cacheDelByPrefix } from "@/lib/cache";

const updateMenuSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  libelle: z.string().min(1).max(200).optional(),
  path: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  ordre: z.number().int().min(0).optional(),
  parentId: z.string().optional().nullable(),
  permission: z.string().max(100).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "menus:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: {
      profilMenus: { select: { profilId: true } },
    },
  });

  if (!menu) {
    return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    ...menu,
    profilIds: menu.profilMenus.map((pm) => pm.profilId),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "menus:manage");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const menu = await prisma.menu.findUnique({ where: { id } });
  if (!menu) {
    return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.code && parsed.data.code !== menu.code) {
    const existing = await prisma.menu.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json({ error: "Un menu avec ce code existe déjà" }, { status: 400 });
    }
  }

  const updated = await prisma.menu.update({
    where: { id },
    data: {
      ...(parsed.data.code && { code: parsed.data.code }),
      ...(parsed.data.libelle && { libelle: parsed.data.libelle }),
      path: parsed.data.path ?? menu.path,
      icon: parsed.data.icon ?? menu.icon,
      ...(parsed.data.ordre !== undefined && { ordre: parsed.data.ordre }),
      parentId: parsed.data.parentId ?? menu.parentId,
      permission: parsed.data.permission ?? menu.permission,
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Menu",
      entityId: id,
      description: `Menu modifié: ${updated.code}`,
    },
  });

  await cacheDelByPrefix("menus:");
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "menus:manage");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const menu = await prisma.menu.findUnique({ where: { id } });
  if (!menu) {
    return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
  }

  await prisma.menu.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Menu",
      entityId: id,
      description: `Menu supprimé: ${menu.code}`,
    },
  });

  await cacheDelByPrefix("menus:");
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { cacheDelByPrefix } from "@/lib/cache";

const createMenuSchema = z.object({
  code: z.string().min(1).max(50),
  libelle: z.string().min(1).max(200),
  path: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  ordre: z.number().int().min(0).default(0),
  parentId: z.string().optional().nullable(),
  permission: z.string().max(100).optional().nullable(),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "menus:manage");
  const canRead = await hasPermission(session.user.id, "menus:read");
  if (!canManage && !canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [menus, profils, profilMenus] = await Promise.all([
    prisma.menu.findMany({
      orderBy: [{ ordre: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        libelle: true,
        path: true,
        icon: true,
        ordre: true,
        parentId: true,
        permission: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.profil.findMany({
      where: { active: true },
      select: { id: true, code: true, libelle: true },
    }),
    prisma.profilMenu.findMany({
      select: { profilId: true, menuId: true },
    }),
  ]);

  const menuProfilIds = new Map<string, string[]>();
  for (const pm of profilMenus) {
    if (!menuProfilIds.has(pm.menuId)) menuProfilIds.set(pm.menuId, []);
    menuProfilIds.get(pm.menuId)!.push(pm.profilId);
  }

  const menusWithProfils = menus.map((m) => ({
    ...m,
    profilIds: menuProfilIds.get(m.id) ?? [],
  }));

  return NextResponse.json({
    menus: menusWithProfils,
    profils,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "menus:manage");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.menu.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json({ error: "Un menu avec ce code existe déjà" }, { status: 400 });
  }

  const menu = await prisma.menu.create({
    data: {
      code: parsed.data.code,
      libelle: parsed.data.libelle,
      path: parsed.data.path ?? null,
      icon: parsed.data.icon ?? null,
      ordre: parsed.data.ordre,
      parentId: parsed.data.parentId ?? null,
      permission: parsed.data.permission ?? null,
      active: parsed.data.active,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Menu",
      entityId: menu.id,
      description: `Menu créé: ${menu.code}`,
    },
  });

  await cacheDelByPrefix("menus:");
  return NextResponse.json(menu, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { cacheDelByPrefix } from "@/lib/cache";

const assignProfilsSchema = z.object({
  profilIds: z.array(z.string().cuid()),
});

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

  const { id: menuId } = await params;
  const menu = await prisma.menu.findUnique({ where: { id: menuId } });
  if (!menu) {
    return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = assignProfilsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profilIds = parsed.data.profilIds;
  const profilsExist = await prisma.profil.count({
    where: { id: { in: profilIds } },
  });
  if (profilsExist !== profilIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs profils invalides" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.profilMenu.deleteMany({ where: { menuId } }),
    ...profilIds.map((profilId) =>
      prisma.profilMenu.create({
        data: { profilId, menuId },
      })
    ),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Menu",
      entityId: menuId,
      description: `Profils assignés au menu ${menu.code}: ${profilIds.length} profil(s)`,
    },
  });

  await cacheDelByPrefix("menus:");
  return NextResponse.json({ ok: true, profilIds });
}

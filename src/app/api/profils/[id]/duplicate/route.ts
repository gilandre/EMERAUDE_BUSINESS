import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "profils:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const suffix = (body.suffix as string) ?? "_COPY";

  const source = await prisma.profil.findUnique({
    where: { id },
    include: {
      permissions: { select: { permissionId: true } },
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const newCode = `${source.code}${suffix}`.replace(/\s+/g, "_");
  const existing = await prisma.profil.findUnique({
    where: { code: newCode },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Un profil avec le code ${newCode} existe déjà. Utilisez un suffixe différent.` },
      { status: 400 }
    );
  }

  const profil = await prisma.profil.create({
    data: {
      code: newCode,
      libelle: `${source.libelle} (copie)`,
      description: source.description,
      active: true,
      permissions: {
        create: source.permissions.map((p) => ({ permissionId: p.permissionId })),
      },
    },
    include: {
      _count: { select: { users: true } },
      permissions: {
        include: { permission: { select: { code: true, libelle: true } } },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Profil",
      entityId: profil.id,
      description: `Profil dupliqué: ${source.libelle} → ${profil.libelle}`,
    },
  });

  return NextResponse.json(profil, { status: 201 });
}

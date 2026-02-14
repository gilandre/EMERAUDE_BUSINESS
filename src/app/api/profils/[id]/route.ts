import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission, invalidatePermissionsCacheForProfil } from "@/lib/permissions";
import { updateProfilSchema } from "@/validations/profil.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "profils:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const profil = await prisma.profil.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
      permissions: {
        include: { permission: { select: { id: true, code: true, libelle: true, module: true } } },
      },
    },
  });

  if (!profil) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  return NextResponse.json(profil);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "profils:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateProfilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.profil.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const data: { code?: string; libelle?: string; description?: string | null; active?: boolean } = {};
  if (parsed.data.code !== undefined) data.code = parsed.data.code;
  if (parsed.data.libelle !== undefined) data.libelle = parsed.data.libelle;
  if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  if (parsed.data.permissionIds !== undefined) {
    await prisma.profilPermission.deleteMany({ where: { profilId: id } });
    if (parsed.data.permissionIds.length > 0) {
      await prisma.profilPermission.createMany({
        data: parsed.data.permissionIds.map((permissionId) => ({
          profilId: id,
          permissionId,
        })),
      });
    }
    await invalidatePermissionsCacheForProfil(id);
  }

  const profil = await prisma.profil.update({
    where: { id },
    data,
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
      action: "UPDATE",
      entity: "Profil",
      entityId: profil.id,
      description: `Profil modifié: ${profil.libelle}`,
      newData: data,
    },
  });

  return NextResponse.json(profil);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "profils:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const profil = await prisma.profil.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!profil) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  if (profil._count.users > 0) {
    return NextResponse.json(
      { error: `${profil._count.users} utilisateur(s) assigné(s). Réassignez-les avant suppression.` },
      { status: 400 }
    );
  }

  await prisma.profil.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Profil",
      entityId: id,
      description: `Profil supprimé: ${profil.libelle}`,
    },
  });

  return NextResponse.json({ success: true });
}

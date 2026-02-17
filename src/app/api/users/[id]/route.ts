import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { updateUserSchema } from "@/validations/user.schema";
import { invalidatePermissionsCache } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "users:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nom: true,
      prenom: true,
      active: true,
      mobileAccess: true,
      lastLoginAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      profilId: true,
      profil: {
        select: {
          id: true,
          code: true,
          libelle: true,
          permissions: {
            select: {
              permission: {
                select: { id: true, code: true, libelle: true, module: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      expires: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
    },
  });

  // Flatten permissions from profil
  const permissions = user.profil?.permissions?.map((pp) => pp.permission) ?? [];

  return NextResponse.json({
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    profil: user.profil ? { id: user.profil.id, code: user.profil.code, libelle: user.profil.libelle } : null,
    permissions,
    sessions: sessions.map((s) => ({
      ...s,
      expires: s.expires.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "users:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  // Email with uniqueness check
  if (parsed.data.email !== undefined && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    data.email = parsed.data.email;
  }

  // Password hashing
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  if (parsed.data.nom !== undefined) data.nom = parsed.data.nom ?? null;
  if (parsed.data.prenom !== undefined) data.prenom = parsed.data.prenom ?? null;
  if (parsed.data.profilId !== undefined) data.profilId = parsed.data.profilId ?? null;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.mobileAccess !== undefined) data.mobileAccess = parsed.data.mobileAccess;

  // Security fields
  if (parsed.data.failedLoginAttempts !== undefined) data.failedLoginAttempts = parsed.data.failedLoginAttempts;
  if (parsed.data.lockedUntil !== undefined) data.lockedUntil = parsed.data.lockedUntil;
  if (parsed.data.mustChangePassword !== undefined) data.mustChangePassword = parsed.data.mustChangePassword;

  if (parsed.data.nom !== undefined || parsed.data.prenom !== undefined) {
    const nom = parsed.data.nom ?? existing.nom ?? "";
    const prenom = parsed.data.prenom ?? existing.prenom ?? "";
    data.name = `${prenom} ${nom}`.trim() || null;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      nom: true,
      prenom: true,
      active: true,
      mobileAccess: true,
      profilId: true,
      profil: { select: { code: true, libelle: true } },
      updatedAt: true,
    },
  });

  await invalidatePermissionsCache(id);
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Utilisateur modifié: ${user.email}`,
      newData: data,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "users:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "User",
      entityId: id,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Utilisateur supprimé: ${user.email}`,
    },
  });

  return NextResponse.json({ success: true });
}

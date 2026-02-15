import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createProfilSchema } from "@/validations/profil.schema";
import { cacheGet, cacheSet, cacheDelByPrefix, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "profils:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = "profils:list";
  const cached = await cacheGet<object[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const profils = await prisma.profil.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { users: true } },
      permissions: {
        include: { permission: { select: { id: true, code: true, libelle: true, module: true } } },
      },
    },
  });

  await cacheSet(cacheKey, profils, CACHE_TTL.PROFILS);
  return NextResponse.json(profils);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "profils:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProfilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.profil.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json({ error: "Un profil avec ce code existe déjà" }, { status: 400 });
  }

  void cacheDelByPrefix("profils:list");

  const profil = await prisma.profil.create({
    data: {
      code: parsed.data.code,
      libelle: parsed.data.libelle,
      description: parsed.data.description ?? null,
      permissions: parsed.data.permissionIds?.length
        ? {
            create: parsed.data.permissionIds.map((permissionId) => ({
              permissionId,
            })),
          }
        : undefined,
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
      description: `Profil créé: ${profil.libelle}`,
    },
  });

  return NextResponse.json(profil, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createUserSchema } from "@/validations/user.schema";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "users:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const search = searchParams.get("search") ?? "";
  const actif = searchParams.get("active");
  const profilId = searchParams.get("profilId");
  const mobileAccess = searchParams.get("mobileAccess");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (actif !== null && actif !== undefined && actif !== "") {
    where.active = actif === "true";
  }
  if (profilId) {
    where.profilId = profilId;
  }
  if (mobileAccess !== null && mobileAccess !== undefined && mobileAccess !== "") {
    where.mobileAccess = mobileAccess === "true";
  }
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" as const } },
      { name: { contains: search, mode: "insensitive" as const } },
    ];
  }

  // Build orderBy
  const validSortFields = ["email", "nom", "active", "lastLoginAt", "createdAt", "profil"];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  if (safeSortBy === "profil") {
    orderBy = { profil: { libelle: safeSortOrder } };
  } else {
    orderBy = { [safeSortBy]: safeSortOrder };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        nom: true,
        prenom: true,
        active: true,
        mobileAccess: true,
        lastLoginAt: true,
        createdAt: true,
        profilId: true,
        profil: { select: { id: true, code: true, libelle: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "users:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      nom: parsed.data.nom ?? null,
      prenom: parsed.data.prenom ?? null,
      name: parsed.data.nom || parsed.data.prenom ? `${parsed.data.prenom ?? ""} ${parsed.data.nom ?? ""}`.trim() : null,
      profilId: parsed.data.profilId ?? null,
      mobileAccess: parsed.data.mobileAccess ?? false,
    },
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
      createdAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Utilisateur créé: ${user.email}`,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

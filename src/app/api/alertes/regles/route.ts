import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAlerteSchema } from "@/validations/alerte.schema";

// GET /api/alertes/regles - Liste des règles (alertes)
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "alertes:read");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const regles = await prisma.alerte.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      libelle: true,
      description: true,
      canaux: true,
      regle: true,
      seuils: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { notifications: true } },
      alerteDestinataires: {
        where: { active: true },
        select: { id: true, type: true, valeur: true, canal: true },
      },
    },
  });

  return NextResponse.json(regles);
}

// POST /api/alertes/regles - Créer une règle (alerte)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "alertes:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAlerteSchema.safeParse({
    code: body.code ?? `ALERTE_${Date.now()}`,
    libelle: body.libelle ?? "Nouvelle alerte",
    description: body.description ?? null,
    canaux: Array.isArray(body.canaux) ? body.canaux : ["email"],
    regle: body.regle ?? null,
    seuils: body.seuils ?? null,
    active: body.active ?? true,
    alerteDestinataires: Array.isArray(body.alerteDestinataires) ? body.alerteDestinataires : [],
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, libelle, description, canaux, regle, seuils, active, alerteDestinataires } = parsed.data;

  const regleCreated = await prisma.alerte.create({
    data: {
      code,
      libelle,
      description: description ?? null,
      canaux,
      regle: regle != null ? (regle as Prisma.InputJsonValue) : Prisma.JsonNull,
      seuils: seuils != null ? (seuils as Prisma.InputJsonValue) : Prisma.JsonNull,
      active: active ?? true,
      alerteDestinataires: alerteDestinataires?.length
        ? {
            create: alerteDestinataires.map((d) => ({
              type: d.type ?? "email",
              valeur: d.valeur,
              canal: d.canal ?? "email",
              active: true,
            })),
          }
        : undefined,
    },
    include: {
      alerteDestinataires: true,
      _count: { select: { notifications: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Alerte",
      entityId: regleCreated.id,
      description: `Règle d'alerte créée: ${regleCreated.libelle}`,
    },
  });

  return NextResponse.json(regleCreated, { status: 201 });
}

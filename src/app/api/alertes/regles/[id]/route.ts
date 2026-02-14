import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { updateAlerteSchema } from "@/validations/alerte.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/alertes/regles/[id] - Détail d'une règle
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "alertes:read");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const regle = await prisma.alerte.findUnique({
    where: { id },
    include: {
      alerteDestinataires: true,
      _count: { select: { notifications: true } },
    },
  });

  if (!regle) {
    return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
  }

  return NextResponse.json(regle);
}

// PUT /api/alertes/regles/[id] - Modifier une règle
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "alertes:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const parsed = updateAlerteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.alerte.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
  }

  const data: { code?: string; libelle?: string; description?: string | null; canaux?: string[]; regle?: unknown; seuils?: unknown; active?: boolean } = {};
  if (parsed.data.code !== undefined) data.code = parsed.data.code;
  if (parsed.data.libelle !== undefined) data.libelle = parsed.data.libelle;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.canaux !== undefined) data.canaux = parsed.data.canaux;
  if (parsed.data.regle !== undefined) data.regle = parsed.data.regle;
  if (parsed.data.seuils !== undefined) data.seuils = parsed.data.seuils;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const alerteDestinataires = parsed.data.alerteDestinataires;

  const regleUpdated = await prisma.$transaction(async (tx) => {
    const updated = await tx.alerte.update({
      where: { id },
      data: data as { code?: string; libelle?: string; description?: string | null; canaux?: string[]; regle?: object; seuils?: object; active?: boolean },
    });

    if (alerteDestinataires !== undefined) {
      await tx.alerteDestinataire.deleteMany({ where: { alerteId: id } });
      if (alerteDestinataires.length > 0) {
        await tx.alerteDestinataire.createMany({
          data: alerteDestinataires.map((d) => ({
            alerteId: id,
            type: d.type,
            valeur: d.valeur,
            canal: d.canal,
            active: true,
          })),
        });
      }
    }

    return tx.alerte.findUniqueOrThrow({
      where: { id },
      include: {
        alerteDestinataires: true,
        _count: { select: { notifications: true } },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Alerte",
      entityId: id,
      oldData: JSON.parse(JSON.stringify(existing)),
      newData: JSON.parse(JSON.stringify(regleUpdated)),
      description: `Règle d'alerte modifiée: ${regleUpdated?.libelle ?? existing.libelle}`,
    },
  });

  return NextResponse.json(regleUpdated);
}

// DELETE /api/alertes/regles/[id] - Supprimer une règle
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "alertes:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.alerte.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
  }

  await prisma.alerte.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Alerte",
      entityId: id,
      description: `Règle d'alerte supprimée: ${existing.libelle}`,
    },
  });

  return NextResponse.json({ success: true });
}

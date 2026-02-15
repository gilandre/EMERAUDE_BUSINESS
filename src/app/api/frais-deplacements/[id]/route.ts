import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateFraisDeplacementSchema } from "@/validations/frais-deplacement.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "frais_deplacement:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const frais = await prisma.fraisDeplacement.findUnique({
      where: { id },
      include: {
        marche: { select: { id: true, code: true, libelle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!frais) {
      return NextResponse.json({ error: "Frais de déplacement introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...frais,
      montant: Number(frais.montant),
    });
  } catch (error) {
    console.error("Erreur GET frais-deplacement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasPermission(session.user.id, "frais_deplacement:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateFraisDeplacementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.fraisDeplacement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Frais de déplacement introuvable" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.libelle !== undefined) data.libelle = parsed.data.libelle;
    if (parsed.data.montant !== undefined) data.montant = parsed.data.montant;
    if (parsed.data.categorie !== undefined) data.categorie = parsed.data.categorie;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut;
    if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;

    const frais = await prisma.fraisDeplacement.update({
      where: { id },
      data,
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "FraisDeplacement",
        entityId: frais.id,
        oldData: {
          libelle: existing.libelle,
          montant: Number(existing.montant),
          statut: existing.statut,
        },
        newData: data,
        description: `Frais de déplacement modifié: ${frais.libelle}`,
      },
    });

    return NextResponse.json({
      ...frais,
      montant: Number(frais.montant),
    });
  } catch (error) {
    console.error("Erreur PUT frais-deplacement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canDelete = await hasPermission(session.user.id, "frais_deplacement:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.fraisDeplacement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Frais de déplacement introuvable" }, { status: 404 });
    }

    await prisma.fraisDeplacement.delete({ where: { id } });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "FraisDeplacement",
        entityId: id,
        description: `Frais de déplacement supprimé: ${existing.libelle} (${Number(existing.montant)} ${existing.devise})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE frais-deplacement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

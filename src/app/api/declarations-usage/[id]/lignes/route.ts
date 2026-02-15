import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createDeclarationLigneSchema } from "@/validations/declaration-usage.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "declarations_usage:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Verify declaration exists
    const declaration = await prisma.declarationUsage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!declaration) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }

    const lignes = await prisma.declarationLigne.findMany({
      where: { declarationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      lignes.map((l) => ({
        ...l,
        montant: Number(l.montant),
      }))
    );
  } catch (error) {
    console.error("Erreur GET declaration lignes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasPermission(session.user.id, "declarations_usage:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = createDeclarationLigneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Verify declaration exists and is editable
    const declaration = await prisma.declarationUsage.findUnique({
      where: { id },
      select: { id: true, statut: true, reference: true },
    });
    if (!declaration) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }
    if (declaration.statut !== "BROUILLON") {
      return NextResponse.json(
        { error: "Impossible de modifier une déclaration qui n'est pas en brouillon" },
        { status: 400 }
      );
    }

    const ligne = await prisma.declarationLigne.create({
      data: {
        declarationId: id,
        libelle: parsed.data.libelle,
        montant: parsed.data.montant,
      },
    });

    // Recalculate totalJustifie
    const allLignes = await prisma.declarationLigne.findMany({
      where: { declarationId: id },
      select: { montant: true },
    });
    const totalJustifie = allLignes.reduce((sum, l) => sum + Number(l.montant), 0);

    await prisma.declarationUsage.update({
      where: { id },
      data: { totalJustifie },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "DeclarationLigne",
        entityId: ligne.id,
        newData: { declarationId: id, libelle: parsed.data.libelle, montant: parsed.data.montant },
        description: `Ligne ajoutée à la déclaration ${declaration.reference}: ${parsed.data.libelle} (${parsed.data.montant})`,
      },
    });

    return NextResponse.json(
      { ...ligne, montant: Number(ligne.montant) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST declaration ligne:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasPermission(session.user.id, "declarations_usage:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const ligneId = searchParams.get("ligneId");

  if (!ligneId) {
    return NextResponse.json({ error: "ligneId requis" }, { status: 400 });
  }

  try {
    // Verify declaration exists and is editable
    const declaration = await prisma.declarationUsage.findUnique({
      where: { id },
      select: { id: true, statut: true, reference: true },
    });
    if (!declaration) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }
    if (declaration.statut !== "BROUILLON") {
      return NextResponse.json(
        { error: "Impossible de modifier une déclaration qui n'est pas en brouillon" },
        { status: 400 }
      );
    }

    // Verify ligne exists and belongs to this declaration
    const ligne = await prisma.declarationLigne.findUnique({
      where: { id: ligneId },
    });
    if (!ligne || ligne.declarationId !== id) {
      return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
    }

    await prisma.declarationLigne.delete({ where: { id: ligneId } });

    // Recalculate totalJustifie
    const remainingLignes = await prisma.declarationLigne.findMany({
      where: { declarationId: id },
      select: { montant: true },
    });
    const totalJustifie = remainingLignes.reduce((sum, l) => sum + Number(l.montant), 0);

    await prisma.declarationUsage.update({
      where: { id },
      data: { totalJustifie },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "DeclarationLigne",
        entityId: ligneId,
        description: `Ligne supprimée de la déclaration ${declaration.reference}: ${ligne.libelle} (${Number(ligne.montant)})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE declaration ligne:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

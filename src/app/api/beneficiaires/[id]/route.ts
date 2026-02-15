import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateBeneficiaireSchema } from "@/validations/beneficiaire.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "beneficiaires:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const beneficiaire = await prisma.beneficiaire.findUnique({
      where: { id },
      include: {
        decaissements: {
          orderBy: { dateDecaissement: "desc" },
          take: 50,
          select: {
            id: true,
            marcheId: true,
            montant: true,
            dateDecaissement: true,
            statut: true,
            reference: true,
            description: true,
            motif: true,
            modePaiement: true,
            source: true,
          },
        },
      },
    });

    if (!beneficiaire) {
      return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...beneficiaire,
      totalPaye: Number(beneficiaire.totalPaye),
      decaissements: beneficiaire.decaissements.map((d) => ({
        ...d,
        montant: Number(d.montant),
      })),
    });
  } catch (error) {
    console.error("Erreur GET beneficiaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasPermission(session.user.id, "beneficiaires:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateBeneficiaireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.beneficiaire.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.contact !== undefined) data.contact = parsed.data.contact ?? null;
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.adresse !== undefined) data.adresse = parsed.data.adresse ?? null;
    if (parsed.data.modePaiement !== undefined) data.modePaiement = parsed.data.modePaiement ?? null;
    if (parsed.data.banque !== undefined) data.banque = parsed.data.banque ?? null;
    if (parsed.data.compteBancaire !== undefined) data.compteBancaire = parsed.data.compteBancaire ?? null;

    const beneficiaire = await prisma.beneficiaire.update({
      where: { id },
      data,
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Beneficiaire",
        entityId: beneficiaire.id,
        oldData: { nom: existing.nom, type: existing.type },
        newData: data,
        description: `Bénéficiaire modifié: ${beneficiaire.nom} (${beneficiaire.code})`,
      },
    });

    return NextResponse.json({
      ...beneficiaire,
      totalPaye: Number(beneficiaire.totalPaye),
    });
  } catch (error) {
    console.error("Erreur PUT beneficiaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canDelete = await hasPermission(session.user.id, "beneficiaires:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.beneficiaire.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });
    }

    // Soft delete: set actif=false
    await prisma.beneficiaire.update({
      where: { id },
      data: { actif: false },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "Beneficiaire",
        entityId: id,
        description: `Bénéficiaire désactivé: ${existing.nom} (${existing.code})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE beneficiaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

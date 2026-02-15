import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateDeclarationUsageSchema } from "@/validations/declaration-usage.schema";

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
    const declaration = await prisma.declarationUsage.findUnique({
      where: { id },
      include: {
        lignes: {
          orderBy: { createdAt: "asc" },
        },
        marche: { select: { id: true, code: true, libelle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!declaration) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...declaration,
      montantRecu: Number(declaration.montantRecu),
      totalJustifie: Number(declaration.totalJustifie),
      lignes: declaration.lignes.map((l) => ({
        ...l,
        montant: Number(l.montant),
      })),
    });
  } catch (error) {
    console.error("Erreur GET declaration-usage:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
  const parsed = updateDeclarationUsageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.declarationUsage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    // Status workflow: BROUILLON -> SOUMIS -> APPROUVE/REJETE
    if (parsed.data.statut !== undefined) {
      const currentStatut = existing.statut;
      const newStatut = parsed.data.statut;

      const validTransitions: Record<string, string[]> = {
        BROUILLON: ["SOUMIS"],
        SOUMIS: ["APPROUVE", "REJETE"],
        REJETE: ["BROUILLON"],
      };

      const allowed = validTransitions[currentStatut] || [];
      if (!allowed.includes(newStatut)) {
        return NextResponse.json(
          {
            error: "Transition de statut invalide",
            detail: `Impossible de passer de ${currentStatut} à ${newStatut}`,
          },
          { status: 400 }
        );
      }

      data.statut = newStatut;

      if (newStatut === "SOUMIS") {
        data.soumisAt = new Date();
      } else if (newStatut === "APPROUVE") {
        data.approuveAt = new Date();
        data.approuveParId = session.user.id;
      } else if (newStatut === "REJETE") {
        if (!parsed.data.motifRejet) {
          return NextResponse.json(
            { error: "Le motif de rejet est requis" },
            { status: 400 }
          );
        }
        data.motifRejet = parsed.data.motifRejet;
      } else if (newStatut === "BROUILLON") {
        // Reset on return to draft
        data.soumisAt = null;
        data.approuveAt = null;
        data.approuveParId = null;
        data.motifRejet = null;
      }
    }

    if (parsed.data.motifRejet !== undefined && parsed.data.statut === undefined) {
      data.motifRejet = parsed.data.motifRejet;
    }

    const declaration = await prisma.declarationUsage.update({
      where: { id },
      data,
      include: {
        lignes: true,
        marche: { select: { id: true, code: true, libelle: true } },
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "DeclarationUsage",
        entityId: declaration.id,
        oldData: { statut: existing.statut },
        newData: data as Record<string, string | number | boolean | null>,
        description: `Déclaration d'usage modifiée: ${declaration.reference} - Statut: ${existing.statut} -> ${declaration.statut}`,
      },
    });

    return NextResponse.json({
      ...declaration,
      montantRecu: Number(declaration.montantRecu),
      totalJustifie: Number(declaration.totalJustifie),
      lignes: declaration.lignes.map((l) => ({
        ...l,
        montant: Number(l.montant),
      })),
    });
  } catch (error) {
    console.error("Erreur PUT declaration-usage:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

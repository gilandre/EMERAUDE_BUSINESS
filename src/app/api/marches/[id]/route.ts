import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateMarcheSchema } from "@/validations/marche.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "marches:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const marche = await prisma.marche.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      libelle: true,
      montantTotal: true,
      montantTotalXOF: true,
      deviseCode: true,
      statut: true,
      dateDebut: true,
      dateFin: true,
      updatedAt: true,
      accomptes: {
        orderBy: { dateEncaissement: "desc" },
        take: 50,
        select: {
          id: true,
          marcheId: true,
          montant: true,
          montantXOF: true,
          tauxChange: true,
          dateEncaissement: true,
          reference: true,
          description: true,
        },
      },
      decaissements: {
        orderBy: { dateDecaissement: "desc" },
        take: 50,
        select: {
          id: true,
          marcheId: true,
          montant: true,
          montantXOF: true,
          tauxChange: true,
          dateDecaissement: true,
          statut: true,
          reference: true,
          description: true,
        },
      },
      prefinancement: {
        select: {
          id: true,
          marcheId: true,
          montant: true,
          montantUtilise: true,
          montantRestant: true,
          active: true,
        },
      },
    },
  });

  if (!marche) {
    return NextResponse.json({ error: "Marché introuvable" }, { status: 404 });
  }

  // Use aggregates for accurate totals (not limited by take: 50)
  const [accAgg, decAgg] = await Promise.all([
    prisma.accompte.aggregate({
      where: { marcheId: id },
      _sum: { montant: true, montantXOF: true },
    }),
    prisma.decaissement.aggregate({
      where: { marcheId: id },
      _sum: { montant: true, montantXOF: true },
    }),
  ]);

  const totalAcc = Number(accAgg._sum.montant ?? 0);
  const totalDec = Number(decAgg._sum.montant ?? 0);
  const totalAccXOF = Number(accAgg._sum.montantXOF ?? 0);
  const totalDecXOF = Number(decAgg._sum.montantXOF ?? 0);
  const solde = totalAcc - totalDec;
  const soldeXOF = totalAccXOF - totalDecXOF;
  const prefinancementUtilise = marche.prefinancement ? Number(marche.prefinancement.montantUtilise) : 0;
  const prefinancementMax = marche.prefinancement ? Number(marche.prefinancement.montant) : 0;

  return NextResponse.json({
    ...marche,
    montant: Number(marche.montantTotal),
    montantTotalXOF: Number(marche.montantTotalXOF),
    accomptes: marche.accomptes.map((a) => ({
      ...a,
      montant: Number(a.montant),
      montantXOF: Number(a.montantXOF),
      tauxChange: Number(a.tauxChange),
    })),
    decaissements: marche.decaissements.map((d) => ({
      ...d,
      montant: Number(d.montant),
      montantXOF: Number(d.montantXOF),
      tauxChange: Number(d.tauxChange),
    })),
    prefinancement: marche.prefinancement
      ? {
          ...marche.prefinancement,
          montant: Number(marche.prefinancement.montant),
          montantMax: Number(marche.prefinancement.montant),
          montantUtilise: Number(marche.prefinancement.montantUtilise),
          utilise: Number(marche.prefinancement.montantUtilise),
          montantRestant: Number(marche.prefinancement.montantRestant),
        }
      : null,
    synthese: {
      totalEncaissements: totalAcc,
      totalDecaissements: totalDec,
      totalEncaissementsXOF: totalAccXOF,
      totalDecaissementsXOF: totalDecXOF,
      solde,
      soldeXOF,
      prefinancementMax,
      prefinancementUtilise,
    },
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "marches:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateMarcheSchema.safeParse({
    ...body,
    montant: body.montant != null ? Number(body.montant) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.marche.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Marché introuvable" }, { status: 404 });
  }

  const data: { libelle?: string; montantTotal?: number; montantTotalXOF?: number; tresorerieDisponible?: number; tresorerieDisponibleXOF?: number; dateDebut?: Date | null; dateFin?: Date | null; statut?: string } = {};
  if (parsed.data.libelle !== undefined) data.libelle = parsed.data.libelle;
  if (parsed.data.montant !== undefined) {
    data.montantTotal = parsed.data.montant;
    data.montantTotalXOF = parsed.data.montant;
    data.tresorerieDisponible = parsed.data.montant;
    data.tresorerieDisponibleXOF = parsed.data.montant;
  }
  if (parsed.data.dateDebut !== undefined) data.dateDebut = parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : null;
  if (parsed.data.dateFin !== undefined) data.dateFin = parsed.data.dateFin ? new Date(parsed.data.dateFin) : null;
  if (parsed.data.statut !== undefined) data.statut = parsed.data.statut;

  const marche = await prisma.marche.update({
    where: { id },
    data,
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Marche",
      entityId: marche.id,
      newData: data,
      description: `Marché modifié: ${marche.libelle} (${marche.code})`,
    },
  });

  return NextResponse.json({
    ...marche,
    montant: Number(marche.montantTotal),
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "marches:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const marche = await prisma.marche.findUnique({ where: { id } });
  if (!marche) {
    return NextResponse.json({ error: "Marché introuvable" }, { status: 404 });
  }

  const libelle = marche.libelle;
  const code = marche.code;

  await prisma.marche.delete({ where: { id } });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Marche",
      entityId: id,
      description: `Marché supprimé: ${libelle} (${code})`,
    },
  });

  return NextResponse.json({ success: true });
}

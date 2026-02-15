import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = "tresorerie:summary";
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalAcc,
    totalDec,
    encMois,
    decMois,
    benefCount,
    decSansJustifCount,
    recentAcc,
    recentDec,
  ] = await Promise.all([
    prisma.accompte.aggregate({ _sum: { montantXOF: true } }),
    prisma.decaissement.aggregate({ _sum: { montantXOF: true } }),
    prisma.accompte.aggregate({
      where: { dateEncaissement: { gte: monthStart } },
      _sum: { montantXOF: true },
    }),
    prisma.decaissement.aggregate({
      where: { dateDecaissement: { gte: monthStart } },
      _sum: { montantXOF: true },
    }),
    prisma.beneficiaire.count(),
    (async () => {
      // Count decaissements without justificatifs (linked via entityType/entityId)
      const allDecIds = await prisma.decaissement.findMany({ select: { id: true } });
      const withJustif = await prisma.justificatif.findMany({
        where: { entityType: "Decaissement" },
        select: { entityId: true },
        distinct: ["entityId"],
      });
      const withJustifSet = new Set(withJustif.map((j) => j.entityId));
      return allDecIds.filter((d) => !withJustifSet.has(d.id)).length;
    })(),
    prisma.accompte.findMany({
      take: 5,
      orderBy: { dateEncaissement: "desc" },
      select: {
        id: true,
        montant: true,
        montantXOF: true,
        dateEncaissement: true,
        reference: true,
        description: true,
        marche: { select: { libelle: true } },
      },
    }),
    prisma.decaissement.findMany({
      take: 5,
      orderBy: { dateDecaissement: "desc" },
      select: {
        id: true,
        montant: true,
        montantXOF: true,
        dateDecaissement: true,
        reference: true,
        description: true,
        marche: { select: { libelle: true } },
      },
    }),
  ]);

  const soldeGlobal = Number(totalAcc._sum.montantXOF ?? 0) - Number(totalDec._sum.montantXOF ?? 0);

  // Merge and sort recent movements
  const mouvements = [
    ...recentAcc.map((a) => ({
      id: a.id,
      type: "encaissement" as const,
      montant: Number(a.montantXOF),
      libelle: a.description || a.reference || "Encaissement",
      date: a.dateEncaissement.toISOString(),
      marcheLibelle: a.marche?.libelle ?? "",
    })),
    ...recentDec.map((d) => ({
      id: d.id,
      type: "decaissement" as const,
      montant: Number(d.montantXOF),
      libelle: d.description || d.reference || "Décaissement",
      date: d.dateDecaissement.toISOString(),
      marcheLibelle: d.marche?.libelle ?? "",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const payload = {
    soldeGlobal,
    totalEncaissementsMois: Number(encMois._sum.montantXOF ?? 0),
    totalDecaissementsMois: Number(decMois._sum.montantXOF ?? 0),
    decaissementsAJustifier: decSansJustifCount,
    totalBeneficiaires: benefCount,
    derniersMouvements: mouvements,
  };

  await cacheSet(cacheKey, payload, 60);
  return NextResponse.json(payload);
}

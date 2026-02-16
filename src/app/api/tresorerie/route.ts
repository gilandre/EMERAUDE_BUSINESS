import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { conversionService } from "@/services/devises/conversion.service";
import { withApiMetrics, type RouteContext } from "@/lib/api-metrics";
import { cacheGet, cacheSet } from "@/lib/cache";

type Period = "7d" | "30d" | "90d";

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getHandler(req: Request, _ctx: RouteContext) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "dashboards:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "30d") as Period;

  const cacheKey = `tresorerie:${period}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const { start, end } = getDateRange(period);
  const daysCount = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalAccomptes,
    totalDecaissements,
    accomptesPeriode,
    decaissementsPeriode,
    soldeDebutPeriode,
    accomptes,
    decaissements,
    marches,
  ] = await Promise.all([
    prisma.accompte.aggregate({ _sum: { montantXOF: true } }),
    prisma.decaissement.aggregate({ _sum: { montantXOF: true } }),
    prisma.accompte.aggregate({
      where: { dateEncaissement: { gte: start, lte: end } },
      _sum: { montantXOF: true },
    }),
    prisma.decaissement.aggregate({
      where: { dateDecaissement: { gte: start, lte: end } },
      _sum: { montantXOF: true },
    }),
    Promise.all([
      prisma.accompte.aggregate({
        where: { dateEncaissement: { lt: start } },
        _sum: { montantXOF: true },
      }),
      prisma.decaissement.aggregate({
        where: { dateDecaissement: { lt: start } },
        _sum: { montantXOF: true },
      }),
    ]).then(([a, d]) => Number(a._sum.montantXOF ?? 0) - Number(d._sum.montantXOF ?? 0)),
    prisma.accompte.findMany({
      where: { dateEncaissement: { gte: start, lte: end } },
      orderBy: { dateEncaissement: "desc" },
      select: {
        id: true,
        marcheId: true,
        montant: true,
        montantXOF: true,
        dateEncaissement: true,
        reference: true,
        description: true,
        marche: { select: { code: true, libelle: true, deviseCode: true } },
      },
    }),
    prisma.decaissement.findMany({
      where: { dateDecaissement: { gte: start, lte: end } },
      orderBy: { dateDecaissement: "desc" },
      select: {
        id: true,
        marcheId: true,
        montant: true,
        montantXOF: true,
        dateDecaissement: true,
        reference: true,
        description: true,
        marche: { select: { code: true, libelle: true, deviseCode: true } },
      },
    }),
    prisma.marche.findMany({
      where: { statut: "actif" },
      select: {
        id: true,
        code: true,
        libelle: true,
        deviseCode: true,
        montantTotal: true,
        montantTotalXOF: true,
        accomptes: { select: { montantXOF: true } },
        decaissements: { select: { montantXOF: true } },
        prefinancement: { select: { montant: true, montantUtilise: true } },
      },
    }),
  ]);

  const totalEnc = Number(totalAccomptes._sum.montantXOF ?? 0);
  const totalDec = Number(totalDecaissements._sum.montantXOF ?? 0);
  const solde = totalEnc - totalDec;

  const encPeriode = Number(accomptesPeriode._sum.montantXOF ?? 0);
  const decPeriode = Number(decaissementsPeriode._sum.montantXOF ?? 0);

  const encByDay: Record<string, number> = {};
  const decByDay: Record<string, number> = {};
  for (const a of accomptes) {
    const k = dayKey(a.dateEncaissement);
    encByDay[k] = (encByDay[k] ?? 0) + Number(a.montantXOF);
  }
  for (const d of decaissements) {
    const k = dayKey(d.dateDecaissement);
    decByDay[k] = (decByDay[k] ?? 0) + Number(d.montantXOF);
  }

  let cumul = soldeDebutPeriode;
  const evolution: { date: string; tresorerie: number }[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = dayKey(d);
    cumul += (encByDay[k] ?? 0) - (decByDay[k] ?? 0);
    evolution.push({ date: k, tresorerie: cumul });
  }

  const mouvements = [
    ...accomptes.map((a) => ({
      id: a.id,
      type: "accompte" as const,
      marcheId: a.marcheId,
      marcheCode: a.marche.code,
      marcheLibelle: a.marche.libelle,
      deviseCode: a.marche.deviseCode ?? "XOF",
      montant: Number(a.montant),
      montantXOF: Number(a.montantXOF),
      date: a.dateEncaissement,
      reference: a.reference,
      description: a.description,
    })),
    ...decaissements.map((d) => ({
      id: d.id,
      type: "decaissement" as const,
      marcheId: d.marcheId,
      marcheCode: d.marche.code,
      marcheLibelle: d.marche.libelle,
      deviseCode: d.marche.deviseCode ?? "XOF",
      montant: Number(d.montant),
      montantXOF: Number(d.montantXOF),
      date: d.dateDecaissement,
      reference: d.reference,
      description: d.description,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);

  const byMarche = marches.map((m) => {
    const acc = m.accomptes.reduce((s, a) => s + Number(a.montantXOF), 0);
    const dec = m.decaissements.reduce((s, d) => s + Number(d.montantXOF), 0);
    const treso = acc - dec;
    const pref = m.prefinancement;
    const prefDispo = pref ? Math.max(0, Number(pref.montant) - Number(pref.montantUtilise)) : 0;
    const soldeAvecPref = treso + prefDispo;
    return {
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      deviseCode: m.deviseCode ?? "XOF",
      montantTotal: Number(m.montantTotalXOF ?? m.montantTotal),
      encaissements: acc,
      decaissements: dec,
      solde: treso,
      prefinancementDispo: prefDispo,
      soldeAvecPref,
    };
  });

  const tauxEUR = await conversionService.getTauxChange("EUR");
  const tauxUSD = await conversionService.getTauxChange("USD");

  const payload = {
    synthese: {
      totalEncaissements: totalEnc,
      totalDecaissements: totalDec,
      solde,
      encaissementsPeriode: encPeriode,
      decaissementsPeriode: decPeriode,
    },
    evolution,
    mouvements,
    byMarche,
    conversionRates: {
      EUR: Number(tauxEUR.toString()),
      USD: Number(tauxUSD.toString()),
    },
    period,
  };

  await cacheSet(cacheKey, payload, 120);
  return NextResponse.json(payload);
}

export const GET = withApiMetrics(getHandler, "api/tresorerie");

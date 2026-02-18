import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/cache";
import { withApiMetrics } from "@/lib/api-metrics";
import { conversionService } from "@/services/devises/conversion.service";

type Period = "today" | "7d" | "30d" | "month" | "custom";

function getDateRange(period: Period, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { start, end };
    case "7d":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    case "30d":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    case "custom":
      if (from && to) {
        return {
          start: new Date(from),
          end: new Date(to),
        };
      }
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    default:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0);
      return { start, end };
  }
}

/** Dérive une catégorie depuis la description du décaissement */
function deriveCategory(desc: string | null): string {
  if (!desc || desc.trim() === "") return "Non catégorisé";
  const d = desc.toLowerCase();
  if (/facture|fact/i.test(d)) return "Factures";
  if (/main|moe|ouvrier|main d'œuvre/i.test(d)) return "Main d'œuvre";
  if (/fourn|materiel|matériel|mat/i.test(d)) return "Fournitures";
  if (/sous-trait|sous trait/i.test(d)) return "Sous-traitance";
  if (/assurance|garantie/i.test(d)) return "Assurances";
  return "Divers";
}

async function getHandler(req: Request, _ctx: { params: Promise<Record<string, string>> }) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "30d") as Period;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const cacheKey = `dashboard:${period}:${from ?? ""}:${to ?? ""}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const { start, end } = getDateRange(period, from, to);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    marchesCount,
    marchesActifs,
    marchesActifsCeMois,
    marchesActifsMoisPrecedent,
    totalAccomptes,
    totalDecaissements,
    accomptesPeriode,
    decaissementsPeriode,
    accomptesMoisPrecedent,
    decaissementsMoisPrecedent,
    accomptes30j,
    decaissements30j,
    accomptesParMois,
    decaissements12mMerged,
    marchesAvecTresorerie,
    marchesFinProche,
    recentNotifications,
    recentAuditLogs,
    recentMarches,
    alertesActivesCount,
    activitesTotal,
    activitesActives,
    activitesSoldeAggregate,
    recentActivites,
  ] = await Promise.all([
    prisma.marche.count(),
    prisma.marche.count({ where: { statut: "actif" } }),
    prisma.marche.count({
      where: {
        statut: "actif",
        createdAt: { gte: monthStart },
      },
    }),
    prisma.marche.count({
      where: {
        statut: "actif",
        createdAt: { gte: prevMonthStart, lt: monthStart },
      },
    }),
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
    prisma.accompte.aggregate({
      where: { dateEncaissement: { gte: prevMonthStart, lt: monthStart } },
      _sum: { montantXOF: true },
    }),
    prisma.decaissement.aggregate({
      where: { dateDecaissement: { gte: prevMonthStart, lt: monthStart } },
      _sum: { montantXOF: true },
    }),
    prisma.accompte.findMany({
      where: { dateEncaissement: { gte: thirtyDaysAgo } },
      select: { dateEncaissement: true, montantXOF: true },
    }),
    prisma.decaissement.findMany({
      where: { dateDecaissement: { gte: thirtyDaysAgo } },
      select: { dateDecaissement: true, montantXOF: true },
    }),
    // Monthly aggregation via raw SQL instead of loading all rows
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR("date_encaissement", 'YYYY-MM') AS month,
             COALESCE(SUM("montant_xof"::float8), 0) AS total
      FROM "Accompte"
      WHERE "date_encaissement" >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR("date_encaissement", 'YYYY-MM')
    `,
    // Merged decaissements12m + decaissementsTous into single query
    prisma.decaissement.findMany({
      where: { dateDecaissement: { gte: twelveMonthsAgo } },
      select: {
        dateDecaissement: true,
        montantXOF: true,
        description: true,
        reference: true,
        beneficiaire: true,
        source: true,
        marche: { select: { deviseCode: true } },
      },
    }),
    prisma.marche.findMany({
      where: { statut: "actif" },
      select: {
        id: true,
        code: true,
        libelle: true,
        montantTotal: true,
        montantTotalXOF: true,
        deviseCode: true,
        accomptes: { select: { montantXOF: true } },
        decaissements: { select: { montantXOF: true } },
        prefinancement: {
          select: { montant: true, montantUtilise: true },
        },
      },
    }),
    prisma.marche.findMany({
      where: {
        dateFin: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, code: true, libelle: true, dateFin: true },
    }),
    prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sujet: true,
        corps: true,
        createdAt: true,
        alerte: { select: { libelle: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.marche.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        libelle: true,
        montantTotal: true,
        montantTotalXOF: true,
        deviseCode: true,
        statut: true,
        updatedAt: true,
        _count: { select: { accomptes: true, decaissements: true } },
      },
    }),
    prisma.alerte.count({ where: { active: true } }),
    // Activités KPIs
    prisma.activite.count(),
    prisma.activite.count({ where: { statut: "ACTIVE" } }),
    prisma.activite.aggregate({ _sum: { soldeXOF: true } }),
    prisma.activite.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        libelle: true,
        type: true,
        statut: true,
        solde: true,
        soldeXOF: true,
        deviseCode: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalAcc = Number(totalAccomptes._sum.montantXOF ?? 0);
  const totalDec = Number(totalDecaissements._sum.montantXOF ?? 0);
  const tresorerie = totalAcc - totalDec;

  const encPeriode = Number(accomptesPeriode._sum.montantXOF ?? 0);
  const decPeriode = Number(decaissementsPeriode._sum.montantXOF ?? 0);
  const encMoisPrec = Number(accomptesMoisPrecedent._sum.montantXOF ?? 0);
  const decMoisPrec = Number(decaissementsMoisPrecedent._sum.montantXOF ?? 0);

  const encEvolution = encMoisPrec > 0 ? ((encPeriode - encMoisPrec) / encMoisPrec) * 100 : 0;
  const decEvolution = decMoisPrec > 0 ? ((decPeriode - decMoisPrec) / decMoisPrec) * 100 : 0;
  const marchesActifsDelta = marchesActifsCeMois - marchesActifsMoisPrecedent;

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const encByDay: Record<string, number> = {};
  const decByDay: Record<string, number> = {};
  for (const a of accomptes30j) {
    const k = dayKey(a.dateEncaissement);
    encByDay[k] = (encByDay[k] ?? 0) + Number(a.montantXOF);
  }
  for (const d of decaissements30j) {
    const k = dayKey(d.dateDecaissement);
    decByDay[k] = (decByDay[k] ?? 0) + Number(d.montantXOF);
  }
  let cumul = 0;
  const treasuryEvolution: { date: string; tresorerie: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    cumul += (encByDay[k] ?? 0) - (decByDay[k] ?? 0);
    treasuryEvolution.push({ date: k, tresorerie: cumul });
  }

  const encByMonth: Record<string, number> = {};
  const decByMonth: Record<string, number> = {};
  // Use pre-aggregated monthly data from raw SQL
  for (const row of accomptesParMois) {
    encByMonth[row.month] = Number(row.total);
  }
  for (const d of decaissements12mMerged) {
    const k = monthKey(d.dateDecaissement);
    decByMonth[k] = (decByMonth[k] ?? 0) + Number(d.montantXOF);
  }
  const months = new Set([...Object.keys(encByMonth), ...Object.keys(decByMonth)]);
  const chartData = Array.from(months)
    .sort()
    .map((month) => ({
      month,
      encaissements: encByMonth[month] ?? 0,
      decaissements: decByMonth[month] ?? 0,
    }));

  const categorySums: Record<string, number> = {};
  const deviseSums: Record<string, number> = {};
  const beneficiarySums: Record<string, number> = {};
  for (const d of decaissements12mMerged) {
    const cat = deriveCategory(d.description);
    const val = Number(d.montantXOF);
    categorySums[cat] = (categorySums[cat] ?? 0) + val;
    const devise = d.marche?.deviseCode ?? "XOF";
    deviseSums[devise] = (deviseSums[devise] ?? 0) + val;
    const benef = (d.beneficiaire ?? "").trim() || "Non renseigné";
    beneficiarySums[benef] = (beneficiarySums[benef] ?? 0) + val;
  }
  const decByCategory = Object.entries(categorySums).map(([name, value]) => ({ name, value }));
  const decByDevise = Object.entries(deviseSums).map(([name, value]) => ({ name, value }));
  const decByBeneficiary = Object.entries(beneficiarySums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const avgDailyEnc = accomptes30j.length > 0
    ? accomptes30j.reduce((s, a) => s + Number(a.montantXOF), 0) / 30
    : 0;
  const avgDailyDec = decaissements30j.length > 0
    ? decaissements30j.reduce((s, d) => s + Number(d.montantXOF), 0) / 30
    : 0;
  let forecastCumul = tresorerie;
  const forecast: { date: string; tresorerie: number }[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    forecastCumul += avgDailyEnc - avgDailyDec;
    forecast.push({
      date: dayKey(d),
      tresorerie: Math.round(forecastCumul * 100) / 100,
    });
  }

  const marchesAttention = marchesAvecTresorerie
    .map((m) => {
      const acc = m.accomptes.reduce((s, a) => s + Number(a.montantXOF), 0);
      const dec = m.decaissements.reduce((s, d) => s + Number(d.montantXOF), 0);
      const treso = acc - dec;
      const montant = Number(m.montantTotalXOF ?? m.montantTotal);
      const ratio = montant > 0 ? (treso / montant) * 100 : 0;
      const pref = m.prefinancement;
      const prefPct =
        pref && Number(pref.montant) > 0
          ? (Number(pref.montantUtilise) / Number(pref.montant)) * 100
          : null;
      return {
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        tresorerie: treso,
        ratio,
        prefinancementPct: prefPct,
      };
    })
    .filter((m) => m.ratio < 10 || (m.prefinancementPct != null && m.prefinancementPct > 90))
    .sort((a, b) => (a.ratio - b.ratio) || ((b.prefinancementPct ?? 0) - (a.prefinancementPct ?? 0)));

  const tauxEUR = await conversionService.getTauxChange("EUR");
  const tauxUSD = await conversionService.getTauxChange("USD");
  const conversionRates = {
    EUR: Number(tauxEUR.toString()),
    USD: Number(tauxUSD.toString()),
  };

  const totalExposition = Object.values(deviseSums).reduce((a, b) => a + b, 0) || 1;
  const deviseExposition = Object.entries(deviseSums).map(([code, val]) => ({
    code,
    value: val,
    percent: Math.round((val / totalExposition) * 100),
  }));

  const seuilCritique = Math.max(0, tresorerie * 0.1);

  const payload = {
    kpis: {
      marchesTotal: marchesCount,
      marchesActifs,
      marchesActifsDelta,
      tresorerie,
      totalEncaissements: totalAcc,
      totalDecaissements: totalDec,
      encEvolution,
      decEvolution,
      alertesActives: alertesActivesCount,
      conversionRates,
      activitesTotal,
      activitesActives,
      activitesSoldeGlobal: Number(activitesSoldeAggregate._sum.soldeXOF ?? 0),
    },
    chartData,
    treasuryEvolution,
    decByCategory,
    decByDevise,
    decByBeneficiary,
    deviseExposition,
    seuilCritique,
    forecast,
    marchesAttention,
    deadlines: marchesFinProche.map((m) => ({
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      dateFin: m.dateFin,
    })),
    recentAlerts: recentNotifications.map((n) => ({
      id: n.id,
      sujet: n.sujet,
      libelle: n.alerte?.libelle ?? "Alerte",
      createdAt: n.createdAt,
    })),
    recentActivity: recentAuditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      description: a.description,
      createdAt: a.createdAt,
    })),
    recentActivites: recentActivites.map((a) => ({
      id: a.id,
      code: a.code,
      libelle: a.libelle,
      type: a.type,
      statut: a.statut,
      solde: Number(a.solde),
      soldeXOF: Number(a.soldeXOF),
      deviseCode: a.deviseCode,
      updatedAt: a.updatedAt,
    })),
    recentMarches: recentMarches.map((m) => ({
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      montant: Number(m.montantTotal),
      montantXOF: Number(m.montantTotalXOF ?? m.montantTotal),
      deviseCode: m.deviseCode ?? "XOF",
      statut: m.statut,
      updatedAt: m.updatedAt,
      _count: m._count,
    })),
  };

  await cacheSet(cacheKey, payload, CACHE_TTL.DASHBOARD);
  return NextResponse.json(payload);
}

export const GET = withApiMetrics(getHandler, "api/dashboard");

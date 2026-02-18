import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = "dashboard:kpis:mobile";
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    marchesActifs,
    totalAccomptes,
    totalDecaissements,
    encMois,
    decMois,
    accomptes7j,
    decaissements7j,
    recentMarches,
    deadlines,
    recentAlerts,
    activitesTotal,
    activitesActives,
    activitesSoldeGlobal,
    recentActivites,
  ] = await Promise.all([
    prisma.marche.count({ where: { statut: "actif" } }),
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
    prisma.accompte.findMany({
      where: { dateEncaissement: { gte: sevenDaysAgo } },
      select: { dateEncaissement: true, montantXOF: true },
    }),
    prisma.decaissement.findMany({
      where: { dateDecaissement: { gte: sevenDaysAgo } },
      select: { dateDecaissement: true, montantXOF: true },
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
    prisma.marche.findMany({
      where: {
        dateFin: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      take: 4,
      select: { id: true, code: true, libelle: true, dateFin: true },
    }),
    prisma.notification.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sujet: true,
        corps: true,
        createdAt: true,
        alerte: { select: { libelle: true } },
      },
    }),
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

  // Treasury evolution 7 days
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const encByDay: Record<string, number> = {};
  const decByDay: Record<string, number> = {};
  for (const a of accomptes7j) {
    const k = dayKey(a.dateEncaissement);
    encByDay[k] = (encByDay[k] ?? 0) + Number(a.montantXOF);
  }
  for (const d of decaissements7j) {
    const k = dayKey(d.dateDecaissement);
    decByDay[k] = (decByDay[k] ?? 0) + Number(d.montantXOF);
  }
  let cumul = 0;
  const treasuryEvolution: { date: string; tresorerie: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    cumul += (encByDay[k] ?? 0) - (decByDay[k] ?? 0);
    treasuryEvolution.push({ date: k, tresorerie: cumul });
  }

  const payload = {
    kpis: {
      marchesActifs,
      tresorerie,
      totalEncaissements: totalAcc,
      totalDecaissements: totalDec,
      encMois: Number(encMois._sum.montantXOF ?? 0),
      decMois: Number(decMois._sum.montantXOF ?? 0),
      activitesTotal,
      activitesActives,
      activitesSoldeGlobal: Number(activitesSoldeGlobal._sum.soldeXOF ?? 0),
    },
    treasuryEvolution,
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
    deadlines: deadlines.map((m) => ({
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      dateFin: m.dateFin,
    })),
    recentAlerts: recentAlerts.map((n) => ({
      id: n.id,
      sujet: n.sujet,
      libelle: n.alerte?.libelle ?? "Alerte",
      createdAt: n.createdAt,
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
  };

  await cacheSet(cacheKey, payload, CACHE_TTL.DASHBOARD);
  return NextResponse.json(payload);
}

import { prisma } from "@/lib/prisma";
import type { ReportQueryConfig } from "./types";
import {
  STATUT_DECAISSEMENT_LABELS,
  STATUT_MARCHE_LABELS,
  SOURCE_LABELS,
  ACTION_LABELS,
  ENTITY_LABELS,
  label,
} from "@/lib/labels";

export interface ReportRow {
  [key: string]: unknown;
}

export async function executeReportQuery(
  config: ReportQueryConfig,
  templateCode: string
): Promise<ReportRow[]> {
  switch (templateCode) {
    case "RAPPORT_FINANCIER_MENSUEL":
      return runFinancierMensuel(config);
    case "RAPPORT_TRESORERIE_PAR_MARCHE":
      return runTresorerieParMarche(config);
    case "RAPPORT_ACCOMPTES_DECAIEMENTS":
      return runAccomptesDecaissements(config);
    case "RAPPORT_PREFINANCEMENTS":
      return runPrefinancements(config);
    case "RAPPORT_ALERTES_DECLENCHEES":
      return runAlertesDeclenchees(config);
    case "RAPPORT_AUDIT_UTILISATEURS":
      return runAuditUtilisateurs(config);
    default:
      return runCustomQuery(config);
  }
}

async function runFinancierMensuel(_config: ReportQueryConfig): Promise<ReportRow[]> {
  const marches = await prisma.marche.findMany({
    include: {
      accomptes: { select: { montant: true, dateEncaissement: true } },
      decaissements: { select: { montant: true, dateDecaissement: true } },
    },
  });
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const result: ReportRow[] = [];
  for (const m of marches) {
    const byMonth: Record<string, { enc: number; dec: number }> = {};
    for (const a of m.accomptes) {
      const k = monthKey(a.dateEncaissement);
      if (!byMonth[k]) byMonth[k] = { enc: 0, dec: 0 };
      byMonth[k].enc += Number(a.montant);
    }
    for (const d of m.decaissements) {
      const k = monthKey(d.dateDecaissement);
      if (!byMonth[k]) byMonth[k] = { enc: 0, dec: 0 };
      byMonth[k].dec += Number(d.montant);
    }
    for (const [month, vals] of Object.entries(byMonth)) {
      result.push({
        Marché: m.libelle,
        Statut: label(STATUT_MARCHE_LABELS, m.statut),
        Mois: month,
        Encaissements: vals.enc,
        Décaissements: vals.dec,
        Trésorerie: vals.enc - vals.dec,
      });
    }
  }
  return result.sort((a, b) => (a.Mois as string).localeCompare(b.Mois as string));
}

async function runTresorerieParMarche(_config: ReportQueryConfig): Promise<ReportRow[]> {
  const marches = await prisma.marche.findMany({
    include: {
      accomptes: { select: { montant: true } },
      decaissements: { select: { montant: true } },
      prefinancement: { select: { montant: true, montantUtilise: true } },
    },
  });
  return marches.map((m) => {
    const enc = m.accomptes.reduce((s, a) => s + Number(a.montant), 0);
    const dec = m.decaissements.reduce((s, d) => s + Number(d.montant), 0);
    const prefDispo = m.prefinancement
      ? Math.max(0, Number(m.prefinancement.montant) - Number(m.prefinancement.montantUtilise))
      : 0;
    return {
      Marché: m.libelle,
      Statut: label(STATUT_MARCHE_LABELS, m.statut),
      "Montant total": Number(m.montantTotal),
      Encaissé: enc,
      Décaissé: dec,
      Trésorerie: enc - dec,
      "Préfinancement disponible": prefDispo,
      "Solde total": enc - dec + prefDispo,
    };
  });
}

async function runAccomptesDecaissements(config: ReportQueryConfig): Promise<ReportRow[]> {
  const from = config.dateFrom ? new Date(config.dateFrom) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const to = config.dateTo ? new Date(config.dateTo) : new Date();
  const [acc, dec] = await Promise.all([
    prisma.accompte.findMany({
      where: { dateEncaissement: { gte: from, lte: to } },
      include: { marche: { select: { code: true, libelle: true } } },
    }),
    prisma.decaissement.findMany({
      where: { dateDecaissement: { gte: from, lte: to } },
      include: { marche: { select: { code: true, libelle: true } } },
    }),
  ]);
  const accRows: ReportRow[] = acc.map((a) => ({
    Type: "Encaissement",
    Date: a.dateEncaissement.toISOString().slice(0, 10),
    Marché: a.marche.libelle,
    Montant: Number(a.montant),
    Référence: a.reference ?? "",
    Description: a.description ?? "",
  }));
  const decRows: ReportRow[] = dec.map((d) => ({
    Type: "Décaissement",
    Date: d.dateDecaissement.toISOString().slice(0, 10),
    Marché: d.marche.libelle,
    Bénéficiaire: d.beneficiaire ?? "",
    Motif: d.motif ?? "",
    Montant: Number(d.montant),
    Statut: label(STATUT_DECAISSEMENT_LABELS, d.statut),
    Source: label(SOURCE_LABELS, d.source),
    Référence: d.reference ?? "",
  }));
  const combined = [...accRows, ...decRows];
  combined.sort((a, b) => (a.Date as string).localeCompare(b.Date as string));
  return combined;
}

async function runPrefinancements(_config: ReportQueryConfig): Promise<ReportRow[]> {
  const prefs = await prisma.prefinancement.findMany({
    include: { marche: true },
  });
  return prefs.map((p) => ({
    Marché: p.marche.libelle,
    "Statut marché": label(STATUT_MARCHE_LABELS, p.marche.statut),
    "Montant max": Number(p.montant),
    Utilisé: Number(p.montantUtilise),
    Restant: Number(p.montantRestant),
    "Taux utilisation (%)": Number(p.montant) > 0
      ? Math.round((Number(p.montantUtilise) / Number(p.montant)) * 100)
      : 0,
    Actif: p.active ? "Oui" : "Non",
  }));
}

async function runAlertesDeclenchees(_config: ReportQueryConfig): Promise<ReportRow[]> {
  const notifications = await prisma.notification.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
    include: { alerte: true },
  });
  return notifications.map((n) => ({
    Date: n.createdAt.toISOString(),
    Alerte: n.alerte.libelle,
    Sujet: n.sujet ?? "",
    Destinataire: n.destinataire,
    Envoyée: n.envoyee ? "Oui" : "Non",
    Erreur: n.erreur ?? "",
  }));
}

async function runAuditUtilisateurs(_config: ReportQueryConfig): Promise<ReportRow[]> {
  const logs = await prisma.auditLog.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, nom: true } } },
  });
  return logs.map((l) => ({
    Date: l.createdAt.toISOString(),
    Utilisateur: l.user?.email ?? "Système",
    Nom: l.user?.nom ?? "",
    Action: label(ACTION_LABELS, l.action),
    Entité: label(ENTITY_LABELS, l.entity),
    Description: l.description ?? "",
  }));
}

async function runCustomQuery(config: ReportQueryConfig): Promise<ReportRow[]> {
  if (config.tables.includes("Marche") && !config.tables.includes("Accompte")) {
    const marches = await prisma.marche.findMany({
      where: config.filters?.length
        ? {
            statut: config.filters.find((f) => f.field === "statut")?.value as string | undefined,
          }
        : undefined,
    });
    return marches.map((m) => ({
      Marché: m.libelle,
      "Montant total": Number(m.montantTotal),
      Statut: label(STATUT_MARCHE_LABELS, m.statut),
      "Date début": m.dateDebut?.toISOString().slice(0, 10) ?? "",
      "Date fin": m.dateFin?.toISOString().slice(0, 10) ?? "",
    }));
  }
  return runTresorerieParMarche(config);
}

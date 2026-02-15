/**
 * Worker d'évaluation périodique : trésorerie faible, deadline approchant.
 * Ajoute des jobs dans la queue alertes selon des règles métier.
 * Lancer avec: npx tsx src/workers/alert-scheduler.worker.ts
 */

import { getAlertQueue } from "@/lib/queues/alert.queue";
import { prisma } from "@/lib/prisma";

const ALERT_QUEUE_NAME = "alertes";

async function evaluateTresorerieFaible(): Promise<void> {
  const marches = await prisma.marche.findMany({
    where: { statut: "actif" },
    include: { prefinancement: true },
  });

  const marcheIds = marches.map((m) => m.id);

  // 2 requêtes groupBy au lieu de 2N requêtes aggregate
  const [accGrouped, decGrouped] = await Promise.all([
    prisma.accompte.groupBy({
      by: ["marcheId"],
      where: { marcheId: { in: marcheIds } },
      _sum: { montant: true },
    }),
    prisma.decaissement.groupBy({
      by: ["marcheId"],
      where: { marcheId: { in: marcheIds } },
      _sum: { montant: true },
    }),
  ]);

  const accMap = new Map(accGrouped.map((a) => [a.marcheId, Number(a._sum.montant ?? 0)]));
  const decMap = new Map(decGrouped.map((d) => [d.marcheId, Number(d._sum.montant ?? 0)]));

  for (const m of marches) {
    const enc = accMap.get(m.id) ?? 0;
    const decSum = decMap.get(m.id) ?? 0;
    const preMax = m.prefinancement ? Number(m.prefinancement.montant) : 0;
    const preUtilise = m.prefinancement ? Number(m.prefinancement.montantUtilise) : 0;
    const solde = enc - decSum + (preMax - preUtilise);

    const seuil = 10000;
    if (solde < seuil) {
      const queue = getAlertQueue();
      await queue.add(
        "trigger",
        {
          eventCode: "TRESORERIE_FAIBLE",
          alerteCode: "TRESORERIE_SEUIL",
          context: {
            marcheId: m.id,
            marcheCode: m.code,
            libelleMarche: m.libelle,
            deviseCode: m.deviseCode ?? "XOF",
            solde,
            seuil,
            montant: solde,
            message: "Trésorerie sous le seuil configuré",
          },
        },
        { jobId: `tresorerie-${m.id}-${Date.now()}` }
      );
    }
  }
}

async function evaluateDeadlineApprochant(): Promise<void> {
  const inDays = 30;
  const limit = new Date();
  limit.setDate(limit.getDate() + inDays);

  const marches = await prisma.marche.findMany({
    where: {
      statut: "actif",
      dateFin: { not: null, lte: limit },
    },
    select: { id: true, code: true, libelle: true, deviseCode: true, dateFin: true },
  });

  for (const m of marches) {
    const dateFin = m.dateFin!;
    const queue = getAlertQueue();
    await queue.add(
      "trigger",
      {
        eventCode: "DEADLINE_APPROCHANT",
        alerteCode: "DEADLINE_APPROCHANT",
        context: {
          marcheId: m.id,
          marcheCode: m.code,
          libelleMarche: m.libelle,
          deviseCode: m.deviseCode ?? "XOF",
          dateFin: dateFin.toISOString(),
          message: "Échéance du marché approchante",
        },
      },
      { jobId: `deadline-${m.id}-${Date.now()}` }
    );
  }
}

async function runPeriodicEvaluation(): Promise<void> {
  console.log("[AlertScheduler] Évaluation trésorerie faible...");
  await evaluateTresorerieFaible();
  console.log("[AlertScheduler] Évaluation deadlines...");
  await evaluateDeadlineApprochant();
  console.log("[AlertScheduler] Cycle terminé.");
}

async function main() {
  const intervalMs = parseInt(process.env.ALERT_SCHEDULER_INTERVAL_MS ?? "3600000", 10); // 1h par défaut
  await runPeriodicEvaluation();
  setInterval(runPeriodicEvaluation, intervalMs);
  console.log(`[AlertScheduler] Prochain cycle dans ${intervalMs / 1000}s`);
}

main().catch((err) => {
  console.error("[AlertScheduler]", err);
  process.exit(1);
});

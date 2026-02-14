/**
 * Worker BullMQ : traite les jobs d'alertes (évaluation + envoi).
 * Lancer avec: npx tsx src/workers/alert-processor.worker.ts
 */

import { Worker, Job } from "bullmq";
import redis from "@/lib/redis";
import { alertEngineService } from "@/services/alerting";
import { prisma } from "@/lib/prisma";
import type { AlertJobPayload } from "@/lib/queues/alert.queue";
import { ALERT_QUEUE_NAME } from "@/lib/queues/alert.queue";

async function processAlertJob(job: Job<AlertJobPayload>): Promise<void> {
  const { alerteCode, context, inAppUserId } = job.data;
  const ctx = context as Parameters<typeof alertEngineService.triggerByCode>[1];

  const alerte = await prisma.alerte.findUnique({
    where: { code: alerteCode, active: true },
  });
  if (!alerte) {
    job.log(`Alerte ${alerteCode} introuvable ou inactive`);
    return;
  }

  const shouldTrigger = await alertEngineService.evaluateRules(alerteCode, ctx);
  if (!shouldTrigger) {
    job.log(`Règle non satisfaite pour ${alerteCode}`);
    return;
  }

  await alertEngineService.triggerByCode(alerteCode, ctx);

  if (inAppUserId) {
    const { buildAlertBodyPlain } = await import("@/services/alerting/alert-format");
    const formatCtx = {
      alerteCode,
      libelle: alerte.libelle,
      message: ctx.message ?? undefined,
      marcheCode: ctx.marcheCode ?? undefined,
      libelleMarche: ctx.libelleMarche ?? undefined,
      deviseCode: ctx.deviseCode ?? "XOF",
      montant: ctx.montant != null ? Number(ctx.montant) : undefined,
      seuil: ctx.seuil != null ? Number(ctx.seuil) : undefined,
      solde: ctx.solde != null ? Number(ctx.solde) : undefined,
      dateFin: ctx.dateFin ?? undefined,
    };
    const corps = buildAlertBodyPlain(formatCtx);
    await prisma.notification.create({
      data: {
        alerteId: alerte.id,
        userId: inAppUserId,
        canal: "in_app",
        destinataire: inAppUserId,
        sujet: alerte.libelle,
        corps,
        envoyee: true,
        envoyeeAt: new Date(),
        marcheId: ctx.marcheId ?? undefined,
      },
    });
  }
}

function runWorker() {
  const worker = new Worker<AlertJobPayload>(
    ALERT_QUEUE_NAME,
    async (job) => processAlertJob(job),
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[AlertWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[AlertWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[AlertWorker] Listening for alert jobs...");
  return worker;
}

runWorker();

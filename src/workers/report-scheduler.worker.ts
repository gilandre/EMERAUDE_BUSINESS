/**
 * Worker de planification des rapports : exécute les rapports planifiés à l'échéance.
 * Lancer avec: npx tsx src/workers/report-scheduler.worker.ts
 */

import { prisma } from "@/lib/prisma";
import { executeReportQuery } from "@/lib/reports/runner";
import { exportToExcel, exportToPdf } from "@/lib/reports/exporters";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { emailService } from "@/services/alerting/email.service";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "rapports");

function nextRunAt(frequence: string, from: Date): Date {
  const d = new Date(from);
  switch (frequence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d;
    case "weekly":
      d.setDate(d.getDate() + 7);
      d.setHours(8, 0, 0, 0);
      return d;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      d.setHours(8, 0, 0, 0);
      return d;
    default:
      d.setDate(d.getDate() + 1);
      return d;
  }
}

async function runScheduledReport(scheduleId: string): Promise<void> {
  const schedule = await prisma.rapportSchedule.findUnique({
    where: { id: scheduleId },
    include: { rapport: true },
  });
  if (!schedule || !schedule.active) return;

  const config = (schedule.config as { format?: string }) ?? {};
  const format = (config.format ?? "excel") as "pdf" | "excel";

  try {
    const data = await executeReportQuery(config as never, schedule.rapportCode);
    const buffer =
      format === "pdf"
        ? exportToPdf(data, schedule.libelle)
        : await exportToExcel(data, schedule.libelle);
    const ext = format === "pdf" ? "pdf" : "xlsx";

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${scheduleId}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await writeFile(filePath, buffer);

    await prisma.rapportExecution.create({
      data: {
        rapportId: schedule.rapportId,
        rapportCode: schedule.rapportCode,
        libelle: `[Planifié] ${schedule.libelle}`,
        format,
        config: config as never,
        filePath: filename,
        fileSize: buffer.length,
        status: "completed",
        executedBy: null,
      },
    });

    const now = new Date();
    const next = nextRunAt(schedule.frequence, now);

    await prisma.rapportSchedule.update({
      where: { id: scheduleId },
      data: { lastRunAt: now, nextRunAt: next },
    });

    const recipients = schedule.recipients ?? [];
    if (recipients.length > 0) {
      const subject = `[Planifié] ${schedule.libelle} - ${now.toLocaleDateString("fr-FR")}`;
      const html = `
        <h2>Rapport planifié</h2>
        <p>Le rapport <strong>${schedule.libelle}</strong> a été généré le ${now.toLocaleString("fr-FR")}.</p>
        <p>Veuillez trouver le fichier en pièce jointe.</p>
      `;
      for (const email of recipients) {
        try {
          await emailService.sendWithAttachment(email, subject, html, {
            filename: `${schedule.libelle.replace(/\s+/g, "_")}.${ext}`,
            content: buffer,
          });
        } catch (err) {
          console.error(`[ReportScheduler] Erreur envoi email à ${email}:`, err);
        }
      }
    }

    console.log(`[ReportScheduler] Rapport "${schedule.libelle}" généré. Prochaine exécution: ${next.toISOString()}`);
  } catch (err) {
    console.error(`[ReportScheduler] Erreur pour ${schedule.libelle}:`, err);
    await prisma.rapportExecution.create({
      data: {
        rapportId: schedule.rapportId,
        rapportCode: schedule.rapportCode,
        libelle: `[Planifié] ${schedule.libelle}`,
        format: "excel",
        status: "failed",
        error: err instanceof Error ? err.message : "Erreur inconnue",
        executedBy: null,
      },
    });
  }
}

async function processDueSchedules(): Promise<void> {
  const now = new Date();
  const due = await prisma.rapportSchedule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: now },
    },
  });

  for (const s of due) {
    await runScheduledReport(s.id);
  }
}

async function main() {
  const intervalMs = parseInt(process.env.REPORT_SCHEDULER_INTERVAL_MS ?? "3600000", 10); // 1h

  async function tick() {
    console.log("[ReportScheduler] Vérification des rapports planifiés...");
    await processDueSchedules();
    console.log(`[ReportScheduler] Prochain cycle dans ${intervalMs / 1000}s`);
  }

  await tick();
  setInterval(tick, intervalMs);
}

main().catch((err) => {
  console.error("[ReportScheduler]", err);
  process.exit(1);
});

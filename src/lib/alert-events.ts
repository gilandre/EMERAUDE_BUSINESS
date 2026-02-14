/**
 * Dispatcher d'événements pour le système d'alertes.
 * À appeler depuis les routes API après création/modification (marché, accompte, etc.).
 */

import type { AlertContext } from "@/services/alerting";

export type AlertEventCode =
  | "MARCHE_CREE"
  | "ACOMPTE_RECU"
  | "DECAISSEMENT_VALIDE"
  | "TRESORERIE_FAIBLE"
  | "DEADLINE_APPROCHANT";

const EVENT_TO_ALERTE_CODE: Record<AlertEventCode, string> = {
  MARCHE_CREE: "MARCHE_CREE",
  ACOMPTE_RECU: "ACOMPTE_RECU",
  DECAISSEMENT_VALIDE: "DECAISSEMENT_VALIDE",
  TRESORERIE_FAIBLE: "TRESORERIE_SEUIL",
  DEADLINE_APPROCHANT: "DEADLINE_APPROCHANT",
};

export interface DispatchOptions {
  /** Si fourni, une notification in-app sera créée pour cet utilisateur */
  inAppUserId?: string;
  /** Exécution synchrone (défaut: true). Si false, l'événement est mis en queue BullMQ. */
  sync?: boolean;
}

/**
 * Déclenche un événement alerte (appelé depuis les API après création marché, accompte, etc.)
 */
export async function dispatchAlertEvent(
  eventCode: AlertEventCode,
  context: AlertContext,
  options: DispatchOptions = {}
): Promise<void> {
  const { inAppUserId, sync = true } = options;
  const alerteCode = EVENT_TO_ALERTE_CODE[eventCode];

  if (sync) {
    const { alertEngineService } = await import("@/services/alerting");
    try {
      await alertEngineService.triggerByCode(alerteCode, context);
      await createInAppNotificationIfNeeded(alerteCode, context, inAppUserId);
    } catch {
      // Ne pas faire échouer l'opération métier si l'alerte échoue
    }
    return;
  }

  // Async via BullMQ (non bloquant)
  try {
    const { getAlertQueue } = await import("@/lib/queues/alert.queue");
    const queue = getAlertQueue();
    await queue.add(
      "trigger",
      { eventCode, alerteCode, context, inAppUserId },
      { attempts: 2, backoff: { type: "exponential", delay: 1000 } }
    );
  } catch {
    // Redis/BullMQ indisponible : ignorer silencieusement
  }
}

async function createInAppNotificationIfNeeded(
  alerteCode: string,
  context: AlertContext,
  userId?: string
): Promise<void> {
  if (!userId) return;
  const { prisma } = await import("@/lib/prisma");
  const { buildAlertBodyPlain } = await import("@/services/alerting/alert-format");
  const alerte = await prisma.alerte.findUnique({
    where: { code: alerteCode, active: true },
  });
  if (!alerte) return;
  const formatCtx = {
    alerteCode,
    libelle: alerte.libelle,
    message: context.message ?? undefined,
    marcheCode: context.marcheCode ?? undefined,
    libelleMarche: context.libelleMarche ?? undefined,
    deviseCode: context.deviseCode ?? "XOF",
    montant: context.montant != null ? Number(context.montant) : undefined,
    seuil: context.seuil != null ? Number(context.seuil) : undefined,
    solde: context.solde != null ? Number(context.solde) : undefined,
    dateFin: context.dateFin ?? undefined,
  };
  const corps = buildAlertBodyPlain(formatCtx);
  await prisma.notification.create({
    data: {
      alerteId: alerte.id,
      userId,
      canal: "in_app",
      destinataire: userId,
      sujet: alerte.libelle,
      corps,
      envoyee: true,
      envoyeeAt: new Date(),
      marcheId: context.marcheId ?? undefined,
    },
  });
}

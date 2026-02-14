import { prisma } from "@/lib/prisma";
import { templateService } from "./template.service";
import { emailService } from "./email.service";
import { smsService } from "./sms.service";
import { pushService } from "./push.service";
import { webhookService } from "./webhook.service";
import { buildAlertBodyHtml, buildAlertBodyPlain, type AlertFormatContext } from "./alert-format";

export type CanalAlerte = "email" | "sms" | "push" | "webhook";

export interface AlertContext {
  [key: string]: unknown;
  marcheId?: string;
  marcheCode?: string;
  libelleMarche?: string;
  libelle?: string;
  deviseCode?: string;
  montant?: number;
  seuil?: number;
  solde?: number;
  type?: string;
  message?: string;
  dateFin?: string;
}

export interface AlertPayload {
  alerteCode: string;
  sujet?: string;
  corps: string;
  variables?: Record<string, string>;
  destinataires?: { canal: CanalAlerte; valeur: string }[];
  marcheId?: string;
  /** Contexte pour le formatage (montants, devise, etc.) */
  formatContext?: AlertFormatContext;
}

const CANAL_SERVICES: Record<
  CanalAlerte,
  { send: (dest: string, sujet: string | undefined, corps: string) => Promise<void> }
> = {
  email: emailService,
  sms: smsService,
  push: pushService,
  webhook: webhookService,
};

export class AlertEngineService {
  /**
   * Évalue les règles d'une alerte selon le contexte
   */
  async evaluateRules(
    alerteCode: string,
    context: AlertContext
  ): Promise<boolean> {
    const alerte = await prisma.alerte.findUnique({
      where: { code: alerteCode, active: true },
    });

    if (!alerte) return false;

    const regle = alerte.regle as Record<string, unknown> | null;
    const seuils = alerte.seuils as Record<string, number> | null;

    if (!regle && !seuils) return true;

    // Règle type "seuil" avec operateur "<" (ex: trésorerie sous un seuil)
    if (regle?.type === "seuil" && regle.champ && regle.operateur === "<") {
      const valeur = context[regle.champ as string] as number | undefined;
      const seuil = (regle.seuil as number) ?? (seuils?.soldeMin as number);
      if (valeur !== undefined && seuil !== undefined && valeur < seuil) {
        return true;
      }
    }

    // Vérification des seuils (trigger quand valeur >= seuil)
    if (seuils) {
      for (const [key, seuil] of Object.entries(seuils)) {
        const valeur = context[key] as number | undefined;
        if (valeur !== undefined && valeur >= seuil) {
          return true;
        }
      }
    }

    // Règles personnalisées
    if (regle?.type === "custom" && typeof regle.evaluate === "function") {
      return (regle.evaluate as (ctx: AlertContext) => boolean)(context);
    }

    return false;
  }

  /**
   * Déclenche une alerte et envoie via les canaux configurés
   */
  async triggerAlert(alerteId: string, payload: AlertPayload): Promise<void> {
    const alerte = await prisma.alerte.findUnique({
      where: { id: alerteId },
      include: { alerteDestinataires: { where: { active: true } } },
    });

    if (!alerte || !alerte.active) {
      throw new Error(`Alerte ${alerteId} introuvable ou inactive`);
    }

    const canaux = payload.destinataires
      ? this._getDestinatairesFromPayload(payload)
      : await this._getDestinatairesFromAlerte(alerte);

    const sujet = payload.sujet ?? alerte.libelle;
    const variables = { ...payload.variables, alerteCode: alerte.code };
    const formatCtx = payload.formatContext ?? this._toFormatContextFromPayload(alerte, payload);
    const useCustomCorps = payload.corps && payload.corps.trim().length > 0;

    for (const { canal, valeur } of canaux) {
      let corpsPourNotification = "";
      try {
        const corpsRendu = useCustomCorps
          ? payload.corps
          : canal === "email"
            ? buildAlertBodyHtml(formatCtx)
            : buildAlertBodyPlain(formatCtx);
        corpsPourNotification = corpsRendu;
        const corpsFinal = await templateService.render(corpsRendu, variables);
        const sujetRendu = await templateService.render(sujet ?? "", variables);
        corpsPourNotification = corpsFinal;

        if (canal === "push") {
          await pushService.sendToUser(valeur, sujetRendu, corpsFinal);
        } else {
          await CANAL_SERVICES[canal].send(valeur, sujetRendu, corpsFinal);
        }

        await prisma.notification.create({
          data: {
            alerteId,
            canal,
            destinataire: valeur,
            sujet: sujetRendu,
            corps: corpsFinal,
            envoyee: true,
            envoyeeAt: new Date(),
            marcheId: payload.marcheId ?? undefined,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.notification.create({
          data: {
            alerteId,
            canal,
            destinataire: valeur,
            sujet: payload.sujet ?? "",
            corps: corpsPourNotification,
            envoyee: false,
            erreur: message,
            marcheId: payload.marcheId ?? undefined,
          },
        });
        // Ne pas propager : continuer vers les autres destinataires
      }
    }
  }

  /**
   * Déclenche une alerte par code
   */
  async triggerByCode(
    alerteCode: string,
    context: AlertContext,
    overrides?: Partial<AlertPayload>
  ): Promise<void> {
    const alerte = await prisma.alerte.findUnique({
      where: { code: alerteCode, active: true },
    });

    if (!alerte) return;

    const shouldTrigger = await this.evaluateRules(alerteCode, context);
    if (!shouldTrigger) return;

    const payload: AlertPayload = {
      alerteCode,
      sujet: alerte.libelle,
      corps: "",
      variables: this._contextToVariables(context),
      marcheId: context.marcheId,
      formatContext: this._toFormatContext(alerte, context),
      ...overrides,
    };

    await this.triggerAlert(alerte.id, payload);
  }

  private _getDestinatairesFromPayload(
    payload: AlertPayload
  ): { canal: CanalAlerte; valeur: string }[] {
    return (payload.destinataires ?? []).map((d) => ({
      canal: d.canal as CanalAlerte,
      valeur: d.valeur,
    }));
  }

  private async _getDestinatairesFromAlerte(alerte: {
    alerteDestinataires: { canal: string; valeur: string }[];
  }): Promise<{ canal: CanalAlerte; valeur: string }[]> {
    return alerte.alerteDestinataires
      .filter((d) =>
        ["email", "sms", "push", "webhook"].includes(d.canal)
      )
      .map((d) => ({ canal: d.canal as CanalAlerte, valeur: d.valeur }));
  }

  private _toFormatContext(alerte: { libelle: string; code: string }, context: AlertContext): AlertFormatContext {
    return {
      alerteCode: alerte.code,
      libelle: alerte.libelle,
      message: context.message ?? undefined,
      marcheCode: context.marcheCode ?? undefined,
      libelleMarche: context.libelleMarche ?? context.libelle ?? undefined,
      deviseCode: context.deviseCode ?? "XOF",
      montant: context.montant != null ? Number(context.montant) : undefined,
      seuil: context.seuil != null ? Number(context.seuil) : undefined,
      solde: context.solde != null ? Number(context.solde) : undefined,
      dateFin: context.dateFin ?? undefined,
    };
  }

  private _toFormatContextFromPayload(alerte: { libelle: string }, payload: AlertPayload): AlertFormatContext {
    const v = payload.variables ?? {};
    return {
      alerteCode: payload.alerteCode,
      libelle: alerte.libelle,
      message: v.message,
      marcheCode: v.marcheCode,
      libelleMarche: v.libelleMarche,
      deviseCode: v.deviseCode ?? "XOF",
      montant: v.montant != null ? Number(v.montant) : undefined,
      seuil: v.seuil != null ? Number(v.seuil) : undefined,
      solde: v.solde != null ? Number(v.solde) : undefined,
      dateFin: v.dateFin,
    };
  }

  private _contextToVariables(context: AlertContext): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(context)) {
      if (v != null) vars[k] = String(v);
    }
    return vars;
  }
}

export const alertEngineService = new AlertEngineService();

import { prisma } from "@/lib/prisma";

export class WebhookService {
  private initialized = false;

  async initialize(): Promise<void> {
    const config = await prisma.configurationCanal.findUnique({
      where: { canal: "WEBHOOK" },
    });
    if (config && !config.isEnabled) {
      throw new Error("Service Webhook désactivé");
    }
    this.initialized = true;
  }

  /**
   * Envoie un payload à l'URL webhook.
   * `to` = URL du webhook
   */
  async send(to: string, subject: string | undefined, body: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const payload = {
      subject: subject ?? "",
      body,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(to, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Emeraude-Business-Alerts/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Webhook échec: ${res.status} ${res.statusText}`);
    }
  }
}

export const webhookService = new WebhookService();

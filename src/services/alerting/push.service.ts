import { prisma } from "@/lib/prisma";

interface PushCredentials {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
}

export class PushService {
  private webPush: Awaited<typeof import("web-push")> | null = null;
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    const config = await prisma.configurationCanal.findUnique({
      where: { canal: "PUSH" },
    });

    if (!config?.isEnabled) {
      throw new Error("Service Push non configuré ou désactivé");
    }

    const credentials = (config.credentials as PushCredentials) ?? {};
    const publicKey = credentials.vapidPublicKey ?? process.env.VAPID_PUBLIC_KEY;
    const privateKey = credentials.vapidPrivateKey ?? process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error("VAPID keys manquantes pour les notifications push");
    }

    this.vapidKeys = { publicKey, privateKey };

    try {
      const webPush = await import("web-push");
      webPush.setVapidDetails(
        "mailto:noreply@emeraude-business.local",
        publicKey,
        privateKey
      );
      this.webPush = webPush;
      this.initialized = true;
    } catch {
      throw new Error("Package web-push non installé. Exécutez: npm install web-push");
    }
  }

  /**
   * Envoie une notification push.
   * `to` = subscription JSON stringifiée ou endpoint URL
   */
  async send(to: string, subject: string | undefined, body: string): Promise<void> {
    if (!this.webPush) {
      await this.initialize();
    }

    let subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    try {
      const parsed = JSON.parse(to) as { endpoint: string; keys?: { p256dh: string; auth: string } };
      if (!parsed.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) {
        throw new Error("Subscription push invalide: endpoint et keys requis");
      }
      subscription = parsed as { endpoint: string; keys: { p256dh: string; auth: string } };
    } catch {
      throw new Error("Destinataire push invalide: subscription JSON attendue");
    }

    const payload = JSON.stringify({
      title: subject ?? "Alerte Emeraude Business",
      body,
    });

    await this.webPush!.sendNotification(subscription as import("web-push").PushSubscription, payload);
  }

  /**
   * Envoie une notification push à un utilisateur (par userId ou email).
   * Récupère ses subscriptions et envoie à chacune.
   */
  async sendToUser(userIdOrEmail: string, subject: string | undefined, body: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: userIdOrEmail.includes("@") ? { email: userIdOrEmail } : { id: userIdOrEmail },
      include: { pushSubscriptions: true },
    });

    if (!user) return;

    const subs = user.pushSubscriptions ?? [];
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: subject ?? "Alerte Emeraude Business",
      body,
    });

    if (!this.webPush) {
      await this.initialize();
    }

    for (const sub of subs) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        await this.webPush!.sendNotification(subscription as import("web-push").PushSubscription, payload);
      } catch {
        // Ignorer les erreurs d'envoi (subscription expirée, etc.)
      }
    }
  }
}

export const pushService = new PushService();

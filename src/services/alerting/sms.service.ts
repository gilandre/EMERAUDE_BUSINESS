import { prisma } from "@/lib/prisma";

interface SmsCredentials {
  accountSid: string;
  authToken: string;
  from?: string;
}

export class SmsService {
  private client: { messages: { create: (opts: object) => Promise<unknown> } } | null = null;
  private fromNumber: string | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    const config = await prisma.configurationCanal.findUnique({
      where: { canal: "SMS" },
    });

    if (!config?.isEnabled) {
      throw new Error("Service SMS non configuré ou désactivé");
    }

    const credentials = config.credentials as SmsCredentials | null;
    if (!credentials?.accountSid || !credentials?.authToken) {
      throw new Error("Credentials SMS incomplètes (Twilio: accountSid, authToken)");
    }

    this.fromNumber = credentials.from ?? process.env.TWILIO_FROM ?? "";

    try {
      const Twilio = (await import("twilio")).default;
      this.client = Twilio(credentials.accountSid, credentials.authToken) as { messages: { create: (opts: object) => Promise<unknown> } };
      this.initialized = true;
    } catch {
      throw new Error("Package twilio non installé. Exécutez: npm install twilio");
    }
  }

  async send(to: string, _subject: string | undefined, body: string): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    const from = this.fromNumber || process.env.TWILIO_FROM;
    if (!from) {
      throw new Error("Numéro d'expéditeur SMS non configuré (TWILIO_FROM ou config)");
    }

    await this.client!.messages.create({
      body,
      from,
      to: this._normalizePhone(to),
    });
  }

  private _normalizePhone(phone: string): string {
    return phone.replace(/\s/g, "").startsWith("+") ? phone : `+33${phone.replace(/^0/, "")}`;
  }
}

export const smsService = new SmsService();

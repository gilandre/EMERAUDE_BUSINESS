import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

interface EmailCredentials {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  password: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    // Priorité 1: config en base (ConfigurationCanal)
    const config = await prisma.configurationCanal.findUnique({
      where: { canal: "EMAIL" },
    });

    let credentials: EmailCredentials | null = null;

    if (config?.isEnabled) {
      const creds = config.credentials as EmailCredentials | null;
      if (creds?.host && creds?.user) credentials = creds;
    }

    // Priorité 2: variables .env (pour tests / dev)
    if (!credentials) {
      const envHost = process.env.EMAIL_HOST ?? process.env.SMTP_HOST;
      const envUser = process.env.EMAIL_USER ?? process.env.SMTP_USER;
      if (envHost && envUser) {
        credentials = {
          host: envHost,
          port: parseInt(process.env.EMAIL_PORT ?? process.env.SMTP_PORT ?? "587", 10),
          secure: process.env.EMAIL_SECURE === "true" || process.env.SMTP_SECURE === "true",
          user: envUser,
          password: process.env.EMAIL_PASSWORD ?? process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? "",
        };
      }
    }

    if (!credentials?.host || !credentials?.user) {
      throw new Error("Service email non configuré (DB ou EMAIL_HOST/EMAIL_USER dans .env)");
    }

    this.transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port ?? 587,
      secure: credentials.secure ?? false,
      auth: {
        user: credentials.user,
        pass: credentials.password,
      },
    });

    this.initialized = true;
  }

  async send(to: string, subject: string | undefined, html: string): Promise<void> {
    if (!this.transporter) {
      await this.initialize();
    }

    const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "noreply@emeraude-business.local";

    await this.transporter!.sendMail({
      from,
      to,
      subject: subject ?? "Alerte Emeraude Business",
      html,
    });
  }

  async sendWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachment: { filename: string; content: Buffer }
  ): Promise<void> {
    if (!this.transporter) {
      await this.initialize();
    }

    const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "noreply@emeraude-business.local";

    await this.transporter!.sendMail({
      from,
      to,
      subject,
      html,
      attachments: [{ filename: attachment.filename, content: attachment.content }],
    });
  }
}

export const emailService = new EmailService();

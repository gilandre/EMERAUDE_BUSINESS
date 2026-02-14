import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getCachedConfigMap } from "@/lib/config-cache";

/**
 * Retourne la config fusionnée : env + DB.
 * Les valeurs en DB prévalent sur env pour les clés configurables.
 * Les secrets (passwords) restent toujours dans .env.
 */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "config:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbConfig = await getCachedConfigMap();

  const maskSecret = (v: string | undefined) => {
    if (!v || v.length < 4) return "••••";
    return v.slice(0, 4) + "••••••••";
  };

  const settings = {
    api: {
      API_URL: {
        value: process.env.API_URL ?? process.env.API_SERVER_URL ?? dbConfig.API_URL ?? "",
        source: dbConfig.API_URL ? "db" : process.env.API_URL ? "env" : "default",
        label: "URL API (port 3001 si séparée)",
        editable: true,
      },
      NEXTAUTH_URL: {
        value: process.env.NEXTAUTH_URL ?? dbConfig.NEXTAUTH_URL ?? "http://localhost:3000",
        source: dbConfig.NEXTAUTH_URL ? "db" : process.env.NEXTAUTH_URL ? "env" : "default",
        label: "URL application web",
        editable: true,
      },
    },
    db: {
      DATABASE_URL: {
        value: maskSecret(process.env.DATABASE_URL),
        source: "env",
        label: "URL connexion base de données",
        editable: false,
        hint: "Défini dans .env uniquement (contient le mot de passe)",
      },
    },
    smtp: {
      SMTP_HOST: {
        value: process.env.SMTP_HOST ?? process.env.EMAIL_HOST ?? dbConfig.SMTP_HOST ?? "",
        source: dbConfig.SMTP_HOST ? "db" : process.env.SMTP_HOST ? "env" : "default",
        label: "Serveur SMTP",
        editable: true,
      },
      SMTP_PORT: {
        value: process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? dbConfig.SMTP_PORT ?? "587",
        source: dbConfig.SMTP_PORT ? "db" : process.env.SMTP_PORT ? "env" : "default",
        label: "Port SMTP",
        editable: true,
      },
      SMTP_USER: {
        value: process.env.SMTP_USER ?? process.env.EMAIL_USER ?? dbConfig.SMTP_USER ?? "",
        source: dbConfig.SMTP_USER ? "db" : process.env.SMTP_USER ? "env" : "default",
        label: "Utilisateur SMTP",
        editable: true,
      },
      SMTP_PASS: {
        value: (process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? process.env.EMAIL_PASSWORD)
          ? "••••••••"
          : "",
        source: "env",
        label: "Mot de passe SMTP",
        editable: false,
        hint: "Défini dans .env (SMTP_PASS ou SMTP_PASSWORD)",
      },
      EMAIL_FROM: {
        value: process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? dbConfig.EMAIL_FROM ?? "",
        source: dbConfig.EMAIL_FROM ? "db" : process.env.EMAIL_FROM ? "env" : "default",
        label: "Email expéditeur",
        editable: true,
      },
    },
    twilio: {
      TWILIO_ACCOUNT_SID: {
        value: process.env.TWILIO_ACCOUNT_SID ?? dbConfig.TWILIO_ACCOUNT_SID ?? "",
        source: dbConfig.TWILIO_ACCOUNT_SID ? "db" : process.env.TWILIO_ACCOUNT_SID ? "env" : "default",
        label: "Account SID",
        editable: true,
      },
      TWILIO_PHONE_NUMBER: {
        value: process.env.TWILIO_PHONE_NUMBER ?? dbConfig.TWILIO_PHONE_NUMBER ?? "",
        source: dbConfig.TWILIO_PHONE_NUMBER ? "db" : process.env.TWILIO_PHONE_NUMBER ? "env" : "default",
        label: "Numéro expéditeur",
        editable: true,
      },
      TWILIO_AUTH_TOKEN: {
        value: process.env.TWILIO_AUTH_TOKEN ? "••••••••" : "",
        source: "env",
        label: "Auth Token",
        editable: false,
        hint: "Défini dans .env uniquement",
      },
    },
  };

  return NextResponse.json(settings);
}

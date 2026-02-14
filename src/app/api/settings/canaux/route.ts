import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/settings/canaux - Retourne la config des canaux pour édition (sans mots de passe)
 */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = await prisma.configurationCanal.findUnique({
    where: { canal: "EMAIL" },
  });

  const sms = await prisma.configurationCanal.findUnique({
    where: { canal: "SMS" },
  });

  const emailCreds = email?.credentials as { host?: string; port?: number; user?: string; from?: string } | null;
  const smsCreds = sms?.credentials as { accountSid?: string; from?: string; phoneNumber?: string } | null;

  return NextResponse.json({
    email: {
      isEnabled: email?.isEnabled ?? false,
      host: emailCreds?.host ?? "",
      port: String(emailCreds?.port ?? 587),
      user: emailCreds?.user ?? "",
      from: emailCreds?.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "",
      hasPassword: !!(process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? (emailCreds as { password?: string })?.password),
    },
    sms: {
      isEnabled: sms?.isEnabled ?? false,
      accountSid: smsCreds?.accountSid ?? process.env.TWILIO_ACCOUNT_SID ?? "",
      phoneNumber: smsCreds?.from ?? smsCreds?.phoneNumber ?? process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM ?? "",
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    },
  });
}

/**
 * PUT /api/settings/canaux - Sauvegarde EMAIL et SMS (ConfigurationCanal)
 * Pour SMTP : mot de passe vide = conserver l'existant (env ou DB)
 */
export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, sms } = body;

  if (email) {
    const existing = await prisma.configurationCanal.findUnique({
      where: { canal: "EMAIL" },
    });
    const oldCreds = (existing?.credentials ?? {}) as Record<string, unknown>;
    const newCreds: Record<string, unknown> = {
      host: email.host ?? oldCreds.host,
      port: parseInt(String(email.port ?? oldCreds.port ?? 587), 10),
      secure: email.secure ?? oldCreds.secure ?? false,
      user: email.user ?? oldCreds.user,
      from: email.from ?? oldCreds.from,
      password: email.password && String(email.password).trim()
        ? String(email.password)
        : (oldCreds.password ?? process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? ""),
    };

    await prisma.configurationCanal.upsert({
      where: { canal: "EMAIL" },
      create: {
        canal: "EMAIL",
        isEnabled: email.isEnabled ?? false,
        credentials: newCreds as Prisma.InputJsonValue,
      },
      update: {
        isEnabled: email.isEnabled ?? existing?.isEnabled ?? false,
        credentials: newCreds as Prisma.InputJsonValue,
      },
    });
  }

  if (sms) {
    const existing = await prisma.configurationCanal.findUnique({
      where: { canal: "SMS" },
    });
    const oldCreds = (existing?.credentials ?? {}) as Record<string, unknown>;
    const newCreds: Record<string, unknown> = {
      accountSid: sms.accountSid ?? oldCreds.accountSid ?? process.env.TWILIO_ACCOUNT_SID,
      from: sms.phoneNumber ?? sms.from ?? oldCreds.from ?? oldCreds.phoneNumber ?? process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM,
      authToken: sms.authToken && String(sms.authToken).trim()
        ? String(sms.authToken)
        : (oldCreds.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? ""),
    };

    await prisma.configurationCanal.upsert({
      where: { canal: "SMS" },
      create: {
        canal: "SMS",
        isEnabled: sms.isEnabled ?? false,
        credentials: newCreds as Prisma.InputJsonValue,
      },
      update: {
        isEnabled: sms.isEnabled ?? existing?.isEnabled ?? false,
        credentials: newCreds as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ success: true });
}

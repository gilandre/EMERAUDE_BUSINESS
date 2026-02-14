import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_TEMPLATES } from "@/lib/reports/templates";

function nextRunAt(frequence: string): Date {
  const now = new Date();
  switch (frequence) {
    case "daily":
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
      return now;
    case "weekly":
      now.setDate(now.getDate() + 7);
      now.setHours(8, 0, 0, 0);
      return now;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      now.setHours(8, 0, 0, 0);
      return now;
    default:
      now.setDate(now.getDate() + 1);
      return now;
  }
}

function cronForFrequence(frequence: string): string {
  switch (frequence) {
    case "daily":
      return "0 8 * * *";
    case "weekly":
      return "0 8 * * 1";
    case "monthly":
      return "0 8 1 * *";
    default:
      return "0 8 * * *";
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rapportCode, libelle, frequence, recipients, config, active = true } = body as {
      rapportCode: string;
      libelle?: string;
      frequence: "daily" | "weekly" | "monthly";
      recipients: string[];
      config?: object;
      active?: boolean;
    };

    const template = REPORT_TEMPLATES.find((t) => t.code === rapportCode);
    if (!template) {
      return NextResponse.json({ error: "Template inconnu" }, { status: 400 });
    }

    if (!recipients?.length || !Array.isArray(recipients)) {
      return NextResponse.json({ error: "Destinataires requis" }, { status: 400 });
    }

    const rapport = await prisma.rapport.upsert({
      where: { code: rapportCode },
      update: {},
      create: {
        code: rapportCode,
        libelle: template.libelle,
        type: template.type,
        config: template.config as never,
      },
    });

    const schedule = await prisma.rapportSchedule.create({
      data: {
        rapportId: rapport.id,
        rapportCode,
        libelle: libelle ?? template.libelle,
        frequence,
        cronExpr: cronForFrequence(frequence),
        config: config ?? {},
        recipients,
        active,
        nextRunAt: nextRunAt(frequence),
      },
    });

    return NextResponse.json({
      id: schedule.id,
      rapportCode,
      frequence,
      nextRunAt: schedule.nextRunAt,
      recipients: schedule.recipients,
    });
  } catch (err) {
    console.error("Schedule error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur planification" },
      { status: 500 }
    );
  }
}

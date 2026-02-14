import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

const CANAUX = ["EMAIL", "SMS", "PUSH", "WEBHOOK"] as const;

// GET /api/alertes/canaux - Liste des configurations canaux
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "alertes:read");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canaux = await prisma.configurationCanal.findMany({
    where: { canal: { in: [...CANAUX] } },
    orderBy: { canal: "asc" },
  });

  // S'assurer qu'il existe une entrée pour chaque canal (sans exposer les credentials complètes)
  const result = CANAUX.map((c) => {
    const found = canaux.find((x) => x.canal === c);
    return {
      id: found?.id,
      canal: c,
      isEnabled: found?.isEnabled ?? false,
      hasCredentials: !!found?.credentials,
      config: found?.config ?? null,
      createdAt: found?.createdAt,
      updatedAt: found?.updatedAt,
    };
  });

  return NextResponse.json(result);
}

// PUT /api/alertes/canaux - Mettre à jour la configuration d'un canal
export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "alertes:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { canal, isEnabled, credentials, config } = body;

  if (!canal || !CANAUX.includes(canal)) {
    return NextResponse.json(
      { error: "Canal invalide. Valeurs attendues: EMAIL, SMS, PUSH, WEBHOOK" },
      { status: 400 }
    );
  }

  const updated = await prisma.configurationCanal.upsert({
    where: { canal },
    create: {
      canal,
      isEnabled: isEnabled ?? false,
      credentials: credentials ?? undefined,
      config: config ?? undefined,
    },
    update: {
      ...(isEnabled !== undefined && { isEnabled }),
      ...(credentials !== undefined && { credentials }),
      ...(config !== undefined && { config }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "ConfigurationCanal",
      entityId: updated.id,
      description: `Configuration canal ${canal} mise à jour`,
    },
  });

  return NextResponse.json({
    id: updated.id,
    canal: updated.canal,
    isEnabled: updated.isEnabled,
    hasCredentials: !!updated.credentials,
    config: updated.config,
    updatedAt: updated.updatedAt,
  });
}

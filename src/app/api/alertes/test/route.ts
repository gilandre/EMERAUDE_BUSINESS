import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { alertEngineService } from "@/services/alerting";
import { consumeRateLimit } from "@/lib/rate-limit";

// POST /api/alertes/test - Tester une règle. Rate limit: 10/min
export async function POST(request: NextRequest) {
  const rateLimitRes = await consumeRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canTest = await hasPermission(session.user.id, "alertes:create");
  if (!canTest) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { alerteId, alerteCode, destinataires, variables } = body;

  let alerte: { id: string; code: string; libelle: string } | null = null;

  if (alerteId) {
    alerte = await prisma.alerte.findUnique({
      where: { id: alerteId },
      select: { id: true, code: true, libelle: true },
    });
  } else if (alerteCode) {
    alerte = await prisma.alerte.findUnique({
      where: { code: alerteCode },
      select: { id: true, code: true, libelle: true },
    });
  }

  if (!alerte) {
    return NextResponse.json(
      { error: "Alerte introuvable. Fournir alerteId ou alerteCode." },
      { status: 400 }
    );
  }

  const payload = {
    alerteCode: alerte.code,
    sujet: `[TEST] ${alerte.libelle}`,
    corps: variables?.message ?? `Ceci est un envoi test pour la règle ${alerte.libelle}.`,
    variables: (variables as Record<string, string>) ?? {},
    destinataires: Array.isArray(destinataires)
      ? destinataires.map((d: { canal: string; valeur: string }) => ({
          canal: d.canal,
          valeur: d.valeur,
        }))
      : undefined,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await alertEngineService.triggerAlert(alerte.id, payload as any);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Échec de l'envoi test", detail: message },
      { status: 500 }
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "TEST_ALERT",
      entity: "Alerte",
      entityId: alerte.id,
      description: `Test d'alerte exécuté: ${alerte.libelle}`,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Envoi test effectué",
    alerteId: alerte.id,
    alerteCode: alerte.code,
  });
}

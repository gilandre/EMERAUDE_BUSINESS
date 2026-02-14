import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { dispatchAlertEvent, type AlertEventCode } from "@/lib/alert-events";
import type { AlertContext } from "@/services/alerting";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET() {
  return NextResponse.json({ message: "Alertes API" });
}

const TRIGGER_EVENT_CODES: AlertEventCode[] = [
  "MARCHE_CREE",
  "ACOMPTE_RECU",
  "DECAISSEMENT_VALIDE",
  "TRESORERIE_FAIBLE",
  "DEADLINE_APPROCHANT",
];

/**
 * POST /api/alertes/trigger - Déclencher manuellement un événement alerte
 * Body: { eventCode: AlertEventCode, context: AlertContext, sync?: boolean }
 */
export async function POST(request: NextRequest) {
  const rateLimitRes = await consumeRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canTrigger = await hasPermission(session.user.id, "alertes:create");
  if (!canTrigger) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { eventCode, context = {}, sync = true } = body;

  if (!eventCode || !TRIGGER_EVENT_CODES.includes(eventCode)) {
    return NextResponse.json(
      {
        error: "eventCode requis",
        allowed: TRIGGER_EVENT_CODES,
      },
      { status: 400 }
    );
  }

  try {
    await dispatchAlertEvent(eventCode, context as AlertContext, {
      inAppUserId: session.user.id,
      sync: !!sync,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Échec du déclenchement", detail: message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    eventCode,
    message: "Alerte déclenchée",
  });
}

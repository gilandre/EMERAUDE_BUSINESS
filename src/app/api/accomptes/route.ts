import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createAccompteSchema } from "@/validations/accompte.schema";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "accomptes:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const marcheId = searchParams.get("marcheId");
  if (!marcheId) {
    return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
  }

  const list = await prisma.accompte.findMany({
    where: { marcheId },
    orderBy: { dateEncaissement: "desc" },
    select: {
      id: true,
      marcheId: true,
      montant: true,
      montantXOF: true,
      dateEncaissement: true,
      reference: true,
      description: true,
    },
  });

  return NextResponse.json(
    list.map((a) => ({
      ...a,
      montant: Number(a.montant),
      montantXOF: Number(a.montantXOF),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "accomptes:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAccompteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { marcheId, montant, dateEncaissement, reference, description } = parsed.data;

  const marche = await prisma.marche.findUnique({
    where: { id: marcheId },
    select: { deviseCode: true, code: true, libelle: true },
  });
  const deviseCode = marche?.deviseCode ?? "XOF";
  const deviseSym = deviseCode === "XOF" ? "FCFA" : deviseCode === "EUR" ? "€" : deviseCode === "USD" ? "$" : deviseCode;

  const accompte = await prisma.accompte.create({
    data: {
      marcheId,
      montant,
      montantXOF: montant,
      tauxChange: 1,
      dateEncaissement: new Date(dateEncaissement),
      reference: reference ?? null,
      description: description ?? null,
    },
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Accompte",
      entityId: accompte.id,
      ipAddress: getRequestIp(request) ?? undefined,
      newData: { marcheId, montant, dateEncaissement },
      description: `Accompte créé: ${montant} ${deviseSym} - Marché ${marcheId}`,
    },
  });

  try {
    const { dispatchAlertEvent } = await import("@/lib/alert-events");
    void dispatchAlertEvent(
      "ACOMPTE_RECU",
      {
        marcheId,
        marcheCode: marche?.code,
        libelleMarche: marche?.libelle,
        deviseCode: marche?.deviseCode ?? "XOF",
        montant,
        message: "Nouvel accompte enregistré",
      },
      { inAppUserId: session.user.id, sync: true }
    );
  } catch {
    // ignore
  }

  return NextResponse.json(
    { ...accompte, montant: Number(accompte.montant) },
    { status: 201 }
  );
}

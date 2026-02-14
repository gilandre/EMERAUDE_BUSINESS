import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createDecaissementSchema } from "@/validations/decaissement.schema";

async function getSoldeMarche(marcheId: string): Promise<{ encaissements: number; decaissements: number; prefinancement: number }> {
  const [acc, dec, pre] = await Promise.all([
    prisma.accompte.aggregate({ where: { marcheId }, _sum: { montant: true } }),
    prisma.decaissement.aggregate({ where: { marcheId }, _sum: { montant: true } }),
    prisma.prefinancement.findUnique({ where: { marcheId } }),
  ]);
  const enc = Number(acc._sum.montant ?? 0);
  const decSum = Number(dec._sum.montant ?? 0);
  const preMax = pre ? Number(pre.montant) : 0;
  const preUtilise = pre ? Number(pre.montantUtilise) : 0;
  const disponible = enc - decSum + (preMax - preUtilise);
  return {
    encaissements: enc,
    decaissements: decSum,
    prefinancement: preMax - preUtilise,
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "decaissements:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const marcheId = searchParams.get("marcheId");
  if (!marcheId) {
    return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
  }

  const list = await prisma.decaissement.findMany({
    where: { marcheId },
    orderBy: { dateDecaissement: "desc" },
    select: {
      id: true,
      marcheId: true,
      montant: true,
      dateDecaissement: true,
      statut: true,
      reference: true,
      description: true,
    },
  });

  return NextResponse.json(
    list.map((d) => ({
      ...d,
      montant: Number(d.montant),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "decaissements:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDecaissementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { marcheId, montant, dateDecaissement, statut, reference, description } = parsed.data;

  const marche = await prisma.marche.findUnique({
    where: { id: marcheId },
    select: { deviseCode: true, code: true, libelle: true },
  });
  const deviseCode = marche?.deviseCode ?? "XOF";
  const deviseSym = deviseCode === "XOF" ? "FCFA" : deviseCode === "EUR" ? "€" : deviseCode === "USD" ? "$" : deviseCode;

  const solde = await getSoldeMarche(marcheId);
  const disponible = solde.encaissements - solde.decaissements + solde.prefinancement;
  if (disponible < montant) {
    return NextResponse.json(
      {
        error: "Trésorerie insuffisante",
        detail: `Disponible: ${disponible.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${deviseSym}, demandé: ${montant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${deviseSym}`,
      },
      { status: 400 }
    );
  }

  const decaissement = await prisma.decaissement.create({
    data: {
      marcheId,
      montant,
      montantXOF: montant,
      tauxChange: 1,
      dateDecaissement: new Date(dateDecaissement),
      statut: statut ?? "VALIDE",
      reference: reference ?? null,
      description: description ?? null,
    },
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Decaissement",
      entityId: decaissement.id,
      newData: { marcheId, montant, dateDecaissement },
      description: `Décaissement créé: ${montant} ${deviseSym} - Marché ${marcheId}`,
    },
  });

  try {
    const { dispatchAlertEvent } = await import("@/lib/alert-events");
    void dispatchAlertEvent(
      "DECAISSEMENT_VALIDE",
      {
        marcheId,
        marcheCode: marche?.code,
        libelleMarche: marche?.libelle,
        deviseCode: marche?.deviseCode ?? "XOF",
        montant,
        message: "Décaissement enregistré",
      },
      { inAppUserId: session.user.id, sync: true }
    );
  } catch {
    // ignore
  }

  return NextResponse.json(
    { ...decaissement, montant: Number(decaissement.montant) },
    { status: 201 }
  );
}

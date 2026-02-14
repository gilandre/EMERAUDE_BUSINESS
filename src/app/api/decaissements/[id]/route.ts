import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { updateDecaissementSchema } from "@/validations/decaissement.schema";
import type { StatutDecaissement } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getSoldeMarche(marcheId: string, excludeDecaissementId?: string): Promise<number> {
  const [acc, dec, pre] = await Promise.all([
    prisma.accompte.aggregate({ where: { marcheId }, _sum: { montant: true } }),
    prisma.decaissement.aggregate({
      where: {
        marcheId,
        ...(excludeDecaissementId ? { id: { not: excludeDecaissementId } } : {}),
      },
      _sum: { montant: true },
    }),
    prisma.prefinancement.findUnique({ where: { marcheId } }),
  ]);
  const enc = Number(acc._sum.montant ?? 0);
  const decSum = Number(dec._sum.montant ?? 0);
  const preMax = pre ? Number(pre.montant) : 0;
  const preUtilise = pre ? Number(pre.montantUtilise) : 0;
  return enc - decSum + (preMax - preUtilise);
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "decaissements:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const decaissement = await prisma.decaissement.findUnique({
    where: { id },
  });

  if (!decaissement) {
    return NextResponse.json({ error: "Décaissement introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    ...decaissement,
    montant: Number(decaissement.montant),
    montantXOF: Number(decaissement.montantXOF),
    dateDecaissement: decaissement.dateDecaissement.toISOString(),
    statut: decaissement.statut,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "decaissements:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDecaissementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.decaissement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Décaissement introuvable" }, { status: 404 });
  }

  if (parsed.data.montant != null) {
    const disponible = await getSoldeMarche(existing.marcheId, id);
    if (disponible < parsed.data.montant) {
      return NextResponse.json(
        {
          error: "Trésorerie insuffisante",
          detail: `Disponible après annulation: ${disponible.toFixed(2)}, nouveau montant: ${parsed.data.montant}`,
        },
        { status: 400 }
      );
    }
  }

  const data: {
    montant?: number;
    montantXOF?: number;
    dateDecaissement?: Date;
    statut?: StatutDecaissement;
    reference?: string | null;
    description?: string | null;
  } = {};

  if (parsed.data.statut != null) data.statut = parsed.data.statut as StatutDecaissement;

  if (parsed.data.montant != null) {
    data.montant = parsed.data.montant;
    data.montantXOF = parsed.data.montant;
  }
  if (parsed.data.dateDecaissement != null) {
    data.dateDecaissement = new Date(parsed.data.dateDecaissement);
  }
  if (parsed.data.reference !== undefined) data.reference = parsed.data.reference ?? null;
  if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;

  const decaissement = await prisma.decaissement.update({
    where: { id },
    data,
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Decaissement",
      entityId: decaissement.id,
      newData: data,
      description: `Décaissement modifié: ${decaissement.id}`,
    },
  });

  return NextResponse.json({
    ...decaissement,
    montant: Number(decaissement.montant),
    montantXOF: Number(decaissement.montantXOF),
    statut: decaissement.statut,
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "decaissements:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const decaissement = await prisma.decaissement.findUnique({ where: { id } });
  if (!decaissement) {
    return NextResponse.json({ error: "Décaissement introuvable" }, { status: 404 });
  }

  const marcheId = decaissement.marcheId;

  await prisma.decaissement.delete({ where: { id } });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Decaissement",
      entityId: id,
      description: `Décaissement supprimé: ${Number(decaissement.montant)} - Marché ${marcheId}`,
    },
  });

  return NextResponse.json({ success: true });
}

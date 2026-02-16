import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateAccompteSchema } from "@/validations/accompte.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "accomptes:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const accompte = await prisma.accompte.findUnique({
    where: { id },
    select: {
      id: true,
      marcheId: true,
      montant: true,
      montantXOF: true,
      tauxChange: true,
      dateEncaissement: true,
      reference: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!accompte) {
    return NextResponse.json({ error: "Accompte introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    ...accompte,
    montant: Number(accompte.montant),
    montantXOF: Number(accompte.montantXOF),
    tauxChange: Number(accompte.tauxChange),
    dateEncaissement: accompte.dateEncaissement.toISOString(),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "accomptes:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateAccompteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.accompte.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Accompte introuvable" }, { status: 404 });
  }

  const data: {
    montant?: number;
    montantXOF?: number;
    dateEncaissement?: Date;
    reference?: string | null;
    description?: string | null;
  } = {};

  if (parsed.data.montant != null) {
    data.montant = parsed.data.montant;
    data.montantXOF = parsed.data.montant;
  }
  if (parsed.data.dateEncaissement != null) {
    data.dateEncaissement = new Date(parsed.data.dateEncaissement);
  }
  if (parsed.data.reference !== undefined) data.reference = parsed.data.reference ?? null;
  if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;

  const accompte = await prisma.accompte.update({
    where: { id },
    data,
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Accompte",
      entityId: accompte.id,
      newData: data,
      description: `Accompte modifié: ${accompte.id}`,
    },
  });

  return NextResponse.json({
    ...accompte,
    montant: Number(accompte.montant),
    montantXOF: Number(accompte.montantXOF),
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canDelete = await hasPermission(session.user.id, "accomptes:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const accompte = await prisma.accompte.findUnique({ where: { id } });
  if (!accompte) {
    return NextResponse.json({ error: "Accompte introuvable" }, { status: 404 });
  }

  const marcheId = accompte.marcheId;

  await prisma.accompte.delete({ where: { id } });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Accompte",
      entityId: id,
      description: `Accompte supprimé: ${Number(accompte.montant)} - Marché ${marcheId}`,
    },
  });

  return NextResponse.json({ success: true });
}

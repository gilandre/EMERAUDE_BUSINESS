import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createPrefinancementSchema } from "@/validations/prefinancement.schema";
import { updatePrefinancementSchema } from "@/validations/prefinancement.schema";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "prefinancements:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const marcheId = searchParams.get("marcheId");
  if (!marcheId) {
    return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
  }

  const pre = await prisma.prefinancement.findUnique({
    where: { marcheId },
  });

  if (!pre) return NextResponse.json(null);

  return NextResponse.json({
    ...pre,
    montant: Number(pre.montant),
    montantMax: Number(pre.montant),
    montantUtilise: Number(pre.montantUtilise),
    utilise: Number(pre.montantUtilise),
    montantRestant: Number(pre.montantRestant),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canAuth = await hasPermission(session.user.id, "prefinancements:authorize");
  if (!canAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPrefinancementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const plafond = parsed.data.montant ?? parsed.data.montantMax ?? 0;
  const marche = await prisma.marche.findUnique({
    where: { id: parsed.data.marcheId },
    select: { deviseCode: true },
  });
  const deviseSym = marche?.deviseCode === "XOF" ? "FCFA" : marche?.deviseCode === "EUR" ? "€" : marche?.deviseCode === "USD" ? "$" : marche?.deviseCode ?? "FCFA";

  const existing = await prisma.prefinancement.findUnique({ where: { marcheId: parsed.data.marcheId } });
  const utilise = existing ? Number(existing.montantUtilise) : 0;
  const restant = plafond - utilise;

  const pre = await prisma.prefinancement.upsert({
    where: { marcheId: parsed.data.marcheId },
    update: {
      montant: plafond,
      montantXOF: plafond,
      montantRestant: restant,
      montantRestantXOF: restant,
      active: parsed.data.active ?? true,
    },
    create: {
      marcheId: parsed.data.marcheId,
      montant: plafond,
      montantXOF: plafond,
      tauxChange: 1,
      montantUtilise: 0,
      montantUtiliseXOF: 0,
      montantRestant: plafond,
      montantRestantXOF: plafond,
      active: parsed.data.active ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: pre ? "UPDATE" : "CREATE",
      entity: "Prefinancement",
      entityId: pre.id,
      description: `Préfinancement: plafond ${plafond.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${deviseSym}`,
    },
  });

  return NextResponse.json({
    ...pre,
    montant: Number(pre.montant),
    montantMax: Number(pre.montant),
    montantUtilise: Number(pre.montantUtilise),
    utilise: Number(pre.montantUtilise),
    montantRestant: Number(pre.montantRestant),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canAuth = await hasPermission(session.user.id, "prefinancements:authorize");
  if (!canAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { marcheId, ...rest } = body;
  if (!marcheId) {
    return NextResponse.json({ error: "marcheId requis" }, { status: 400 });
  }
  const parsed = updatePrefinancementSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: { montant?: number; montantXOF?: number; montantRestant?: number; montantRestantXOF?: number; active?: boolean } = {};
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  const plafond = parsed.data.montant ?? parsed.data.montantMax;
  if (plafond !== undefined) {
    const existing = await prisma.prefinancement.findUnique({ where: { marcheId } });
    const utilise = existing ? Number(existing.montantUtilise) : 0;
    updateData.montant = plafond;
    updateData.montantXOF = plafond;
    updateData.montantRestant = plafond - utilise;
    updateData.montantRestantXOF = plafond - utilise;
  }

  const pre = await prisma.prefinancement.update({
    where: { marcheId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Prefinancement",
      entityId: pre.id,
      description: "Préfinancement modifié",
    },
  });

  return NextResponse.json({
    ...pre,
    montant: Number(pre.montant),
    montantMax: Number(pre.montant),
    montantUtilise: Number(pre.montantUtilise),
    utilise: Number(pre.montantUtilise),
    montantRestant: Number(pre.montantRestant),
  });
}

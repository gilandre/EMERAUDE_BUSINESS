import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const devise = await prisma.devise.findUnique({
    where: { id },
  });

  if (!devise) {
    return NextResponse.json({ error: "Devise non trouvée" }, { status: 404 });
  }

  return NextResponse.json({
    ...devise,
    tauxVersXOF: Number(devise.tauxVersXOF),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const devise = await prisma.devise.findUnique({ where: { id } });
  if (!devise) {
    return NextResponse.json({ error: "Devise non trouvée" }, { status: 404 });
  }

  // Blocage modification manuelle EUR/XOF (taux fixe BCEAO)
  if (body.tauxVersXOF != null && ["EUR", "XOF"].includes(devise.code)) {
    return NextResponse.json(
      { error: "Les taux EUR et XOF sont fixes (BCEAO). Utilisez la mise à jour via API externe." },
      { status: 400 }
    );
  }

  const deviseUpdated = await prisma.devise.update({
    where: { id },
    data: {
      ...(body.code != null && { code: body.code }),
      ...(body.nom != null && { nom: body.nom }),
      ...(body.symbole != null && { symbole: body.symbole }),
      ...(body.tauxVersXOF != null && { tauxVersXOF: Number(body.tauxVersXOF) }),
      ...(body.isActive != null && { isActive: !!body.isActive }),
      ...(body.decimales != null && { decimales: Number(body.decimales) }),
      ...(body.pays != null && { pays: body.pays }),
    },
  });

  return NextResponse.json({
    ...deviseUpdated,
    tauxVersXOF: Number(deviseUpdated.tauxVersXOF),
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const devise = await prisma.devise.findUnique({ where: { id } });
  if (!devise) {
    return NextResponse.json({ error: "Devise non trouvée" }, { status: 404 });
  }

  const count = await prisma.marche.count({ where: { deviseId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `${count} marché(s) utilisent cette devise. Désactivez-la plutôt.` },
      { status: 400 }
    );
  }

  await prisma.devise.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

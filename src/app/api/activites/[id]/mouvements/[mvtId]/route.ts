import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";

interface RouteParams {
  params: Promise<{ id: string; mvtId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canDelete = await hasPermission(session.user.id, "activites:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, mvtId } = await params;

  const mouvement = await prisma.mouvementActivite.findFirst({
    where: { id: mvtId, activiteId: id },
  });
  if (!mouvement) {
    return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });
  }

  const activite = await prisma.activite.findUnique({
    where: { id },
    select: { code: true, libelle: true, deviseCode: true, totalEntrees: true, totalSorties: true, totalEntreesXOF: true, totalSortiesXOF: true },
  });

  await prisma.mouvementActivite.delete({ where: { id: mvtId } });

  // Recalculate activite totals
  if (activite) {
    const montant = Number(mouvement.montant);
    const montantXOF = Number(mouvement.montantXOF);
    const newEntrees = Number(activite.totalEntrees) - (mouvement.sens === "ENTREE" ? montant : 0);
    const newSorties = Number(activite.totalSorties) - (mouvement.sens === "SORTIE" ? montant : 0);
    const newEntreesXOF = Number(activite.totalEntreesXOF) - (mouvement.sens === "ENTREE" ? montantXOF : 0);
    const newSortiesXOF = Number(activite.totalSortiesXOF) - (mouvement.sens === "SORTIE" ? montantXOF : 0);

    await prisma.activite.update({
      where: { id },
      data: {
        totalEntrees: Math.max(0, newEntrees),
        totalEntreesXOF: Math.max(0, newEntreesXOF),
        totalSorties: Math.max(0, newSorties),
        totalSortiesXOF: Math.max(0, newSortiesXOF),
        solde: newEntrees - newSorties,
        soldeXOF: newEntreesXOF - newSortiesXOF,
      },
    });
  }

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "MouvementActivite",
      entityId: mvtId,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Mouvement supprimé: ${Number(mouvement.montant)} ${activite?.deviseCode ?? ""} - Activité ${activite?.code}`,
    },
  });

  return NextResponse.json({ success: true });
}

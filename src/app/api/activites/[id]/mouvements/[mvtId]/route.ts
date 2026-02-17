import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { updateMouvementSchema } from "@/validations/mouvement-activite.schema";
import { conversionService } from "@/services/devises/conversion.service";

interface RouteParams {
  params: Promise<{ id: string; mvtId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasPermission(session.user.id, "activites:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, mvtId } = await params;

  const body = await request.json();
  const parsed = updateMouvementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const oldMouvement = await prisma.mouvementActivite.findFirst({
    where: { id: mvtId, activiteId: id },
  });
  if (!oldMouvement) {
    return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });
  }

  const activite = await prisma.activite.findUnique({
    where: { id },
    select: {
      id: true, code: true, libelle: true, deviseCode: true, statut: true,
      totalEntrees: true, totalSorties: true, totalEntreesXOF: true, totalSortiesXOF: true,
    },
  });
  if (!activite) {
    return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
  }
  if (activite.statut !== "ACTIVE") {
    return NextResponse.json({ error: "Impossible de modifier un mouvement sur une activité clôturée ou archivée" }, { status: 400 });
  }

  const updates = parsed.data;
  const newSens = updates.sens ?? oldMouvement.sens;
  const newMontant = updates.montant ?? Number(oldMouvement.montant);

  // Recalculate montantXOF only if montant changed
  let newMontantXOF: number;
  let newTauxChange: number;
  if (updates.montant !== undefined && updates.montant !== Number(oldMouvement.montant)) {
    const tauxChange = await conversionService.getTauxChange(activite.deviseCode);
    newTauxChange = Number(tauxChange.toString());
    newMontantXOF = newMontant * newTauxChange;
  } else {
    newMontantXOF = Number(oldMouvement.montantXOF);
    newTauxChange = Number(oldMouvement.tauxChange);
  }

  const oldMontant = Number(oldMouvement.montant);
  const oldMontantXOF = Number(oldMouvement.montantXOF);
  const oldSens = oldMouvement.sens;

  // Reverse old amounts from totals
  let entrees = Number(activite.totalEntrees) - (oldSens === "ENTREE" ? oldMontant : 0);
  let sorties = Number(activite.totalSorties) - (oldSens === "SORTIE" ? oldMontant : 0);
  let entreesXOF = Number(activite.totalEntreesXOF) - (oldSens === "ENTREE" ? oldMontantXOF : 0);
  let sortiesXOF = Number(activite.totalSortiesXOF) - (oldSens === "SORTIE" ? oldMontantXOF : 0);

  // Apply new amounts
  entrees += newSens === "ENTREE" ? newMontant : 0;
  sorties += newSens === "SORTIE" ? newMontant : 0;
  entreesXOF += newSens === "ENTREE" ? newMontantXOF : 0;
  sortiesXOF += newSens === "SORTIE" ? newMontantXOF : 0;

  const newSolde = entrees - sorties;
  const newSoldeXOF = entreesXOF - sortiesXOF;

  const updated = await prisma.$transaction(async (tx) => {
    const mvt = await tx.mouvementActivite.update({
      where: { id: mvtId },
      data: {
        sens: newSens,
        montant: newMontant,
        montantXOF: newMontantXOF,
        tauxChange: newTauxChange,
        dateMouvement: updates.dateMouvement ? new Date(updates.dateMouvement) : undefined,
        ...(updates.categorie !== undefined ? { categorie: updates.categorie } : {}),
        ...(updates.reference !== undefined ? { reference: updates.reference } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.motif !== undefined ? { motif: updates.motif } : {}),
        ...(updates.beneficiaire !== undefined ? { beneficiaire: updates.beneficiaire } : {}),
        ...(updates.beneficiaireId !== undefined ? { beneficiaireId: updates.beneficiaireId } : {}),
        ...(updates.modePaiement !== undefined ? { modePaiement: updates.modePaiement } : {}),
      },
    });

    await tx.activite.update({
      where: { id },
      data: {
        totalEntrees: Math.max(0, entrees),
        totalEntreesXOF: Math.max(0, entreesXOF),
        totalSorties: Math.max(0, sorties),
        totalSortiesXOF: Math.max(0, sortiesXOF),
        solde: newSolde,
        soldeXOF: newSoldeXOF,
      },
    });

    return mvt;
  });

  const deviseSym = activite.deviseCode === "XOF" ? "FCFA" : activite.deviseCode;

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "MouvementActivite",
      entityId: mvtId,
      ipAddress: getRequestIp(request) ?? undefined,
      oldData: { sens: oldSens, montant: oldMontant, montantXOF: oldMontantXOF },
      newData: { sens: newSens, montant: newMontant, montantXOF: newMontantXOF },
      description: `Mouvement modifié: ${newMontant} ${deviseSym} (${newSens}) - Activité ${activite.code}`,
    },
  });

  // Alert: mouvement updated
  try {
    const { dispatchAlertEvent } = await import("@/lib/alert-events");
    void dispatchAlertEvent(
      "MOUVEMENT_ACTIVITE",
      {
        activiteId: id,
        activiteCode: activite.code,
        libelleActivite: activite.libelle,
        sens: newSens,
        montant: newMontant,
        deviseCode: activite.deviseCode,
        message: `Mouvement modifié: ${newMontant} ${deviseSym} (${newSens}) - Activité ${activite.code}`,
      },
      { inAppUserId: session.user.id, sync: true }
    );
  } catch {
    // ignore
  }

  // Alert if solde becomes negative
  if (newSolde < 0) {
    try {
      const { dispatchAlertEvent } = await import("@/lib/alert-events");
      void dispatchAlertEvent(
        "ACTIVITE_SOLDE_NEGATIF",
        {
          activiteId: id,
          activiteCode: activite.code,
          libelleActivite: activite.libelle,
          solde: newSolde,
          deviseCode: activite.deviseCode,
          message: `Le solde de l'activité ${activite.code} est négatif: ${newSolde} ${deviseSym}`,
        },
        { inAppUserId: session.user.id, sync: true }
      );
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ...updated, montant: Number(updated.montant), montantXOF: Number(updated.montantXOF) });
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

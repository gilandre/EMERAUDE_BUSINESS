import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createMouvementSchema } from "@/validations/mouvement-activite.schema";
import { getRequestIp } from "@/lib/request-ip";
import { conversionService } from "@/services/devises/conversion.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "activites:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const sens = searchParams.get("sens");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { activiteId: id };
  if (sens === "ENTREE" || sens === "SORTIE") where.sens = sens;

  const [mouvements, total] = await Promise.all([
    prisma.mouvementActivite.findMany({
      where,
      orderBy: { dateMouvement: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sens: true,
        montant: true,
        montantXOF: true,
        dateMouvement: true,
        categorie: true,
        reference: true,
        description: true,
        motif: true,
        beneficiaire: true,
        beneficiaireId: true,
        modePaiement: true,
        createdAt: true,
      },
    }),
    prisma.mouvementActivite.count({ where }),
  ]);

  return NextResponse.json({
    data: mouvements.map((m) => ({
      ...m,
      montant: Number(m.montant),
      montantXOF: Number(m.montantXOF),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "activites:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = createMouvementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const activite = await prisma.activite.findUnique({
    where: { id },
    select: { id: true, code: true, libelle: true, deviseCode: true, statut: true, totalEntrees: true, totalSorties: true, totalEntreesXOF: true, totalSortiesXOF: true },
  });
  if (!activite) {
    return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
  }
  if (activite.statut !== "ACTIVE") {
    return NextResponse.json({ error: "Impossible d'ajouter un mouvement à une activité clôturée ou archivée" }, { status: 400 });
  }

  const { sens, montant, dateMouvement, categorie, reference, description, motif, beneficiaire, beneficiaireId, modePaiement } = parsed.data;

  const tauxChange = await conversionService.getTauxChange(activite.deviseCode);
  const tauxChangeNum = Number(tauxChange.toString());
  const montantXOF = montant * tauxChangeNum;

  const mouvement = await prisma.mouvementActivite.create({
    data: {
      activiteId: id,
      sens,
      montant,
      montantXOF,
      tauxChange: tauxChangeNum,
      dateMouvement: new Date(dateMouvement),
      categorie: categorie ?? null,
      reference: reference ?? null,
      description: description ?? null,
      motif: motif ?? null,
      beneficiaire: beneficiaire ?? null,
      beneficiaireId: beneficiaireId ?? null,
      modePaiement: modePaiement ?? null,
    },
  });

  // Update activite totals
  const newEntrees = Number(activite.totalEntrees) + (sens === "ENTREE" ? montant : 0);
  const newSorties = Number(activite.totalSorties) + (sens === "SORTIE" ? montant : 0);
  const newSolde = newEntrees - newSorties;
  const newEntreesXOF = Number(activite.totalEntreesXOF) + (sens === "ENTREE" ? montantXOF : 0);
  const newSortiesXOF = Number(activite.totalSortiesXOF) + (sens === "SORTIE" ? montantXOF : 0);
  const newSoldeXOF = newEntreesXOF - newSortiesXOF;

  await prisma.activite.update({
    where: { id },
    data: {
      totalEntrees: newEntrees,
      totalEntreesXOF: newEntreesXOF,
      totalSorties: newSorties,
      totalSortiesXOF: newSortiesXOF,
      solde: newSolde,
      soldeXOF: newSoldeXOF,
    },
  });

  const deviseSym = activite.deviseCode === "XOF" ? "FCFA" : activite.deviseCode;

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "MouvementActivite",
      entityId: mouvement.id,
      ipAddress: getRequestIp(request) ?? undefined,
      newData: { activiteId: id, sens, montant, dateMouvement },
      description: `Mouvement ${sens === "ENTREE" ? "entrée" : "sortie"}: ${montant} ${deviseSym} - Activité ${activite.code}`,
    },
  });

  // Alert: mouvement created
  try {
    const { dispatchAlertEvent } = await import("@/lib/alert-events");
    void dispatchAlertEvent(
      "MOUVEMENT_ACTIVITE",
      {
        activiteId: id,
        activiteCode: activite.code,
        libelleActivite: activite.libelle,
        sens,
        montant,
        deviseCode: activite.deviseCode,
        message: `Mouvement ${sens === "ENTREE" ? "entrée" : "sortie"}: ${montant} ${deviseSym} - Activité ${activite.code}`,
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

  return NextResponse.json(
    { ...mouvement, montant: Number(mouvement.montant), montantXOF: Number(mouvement.montantXOF) },
    { status: 201 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { updateActiviteSchema } from "@/validations/activite.schema";
import { getRequestIp } from "@/lib/request-ip";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canRead = await hasPermission(session.user.id, "activites:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const activite = await prisma.activite.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        type: true,
        statut: true,
        deviseId: true,
        deviseCode: true,
        tauxChangeCreation: true,
        budgetPrevisionnel: true,
        budgetPrevisionnelXOF: true,
        totalEntrees: true,
        totalEntreesXOF: true,
        totalSorties: true,
        totalSortiesXOF: true,
        solde: true,
        soldeXOF: true,
        dateDebut: true,
        dateFin: true,
        responsableId: true,
        responsable: { select: { id: true, name: true, email: true } },
        createdAt: true,
        updatedAt: true,
        _count: { select: { mouvements: true } },
      },
    });

    if (!activite) {
      return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...activite,
      tauxChangeCreation: Number(activite.tauxChangeCreation),
      budgetPrevisionnel: activite.budgetPrevisionnel ? Number(activite.budgetPrevisionnel) : null,
      budgetPrevisionnelXOF: activite.budgetPrevisionnelXOF ? Number(activite.budgetPrevisionnelXOF) : null,
      totalEntrees: Number(activite.totalEntrees),
      totalEntreesXOF: Number(activite.totalEntreesXOF),
      totalSorties: Number(activite.totalSorties),
      totalSortiesXOF: Number(activite.totalSortiesXOF),
      solde: Number(activite.solde),
      soldeXOF: Number(activite.soldeXOF),
    });
  } catch (err) {
    console.error("[API] GET /api/activites/[id] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canUpdate = await hasPermission(session.user.id, "activites:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateActiviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.activite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (parsed.data.libelle !== undefined) data.libelle = parsed.data.libelle;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut;
    if (parsed.data.budgetPrevisionnel !== undefined) {
      data.budgetPrevisionnel = parsed.data.budgetPrevisionnel;
      if (parsed.data.budgetPrevisionnel !== null) {
        data.budgetPrevisionnelXOF = parsed.data.budgetPrevisionnel * Number(existing.tauxChangeCreation);
      } else {
        data.budgetPrevisionnelXOF = null;
      }
    }
    if (parsed.data.dateDebut !== undefined) data.dateDebut = parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : null;
    if (parsed.data.dateFin !== undefined) data.dateFin = parsed.data.dateFin ? new Date(parsed.data.dateFin) : null;
    if (parsed.data.responsableId !== undefined) data.responsableId = parsed.data.responsableId;

    const activite = await prisma.activite.update({
      where: { id },
      data,
      select: { id: true, code: true, libelle: true, type: true, statut: true, updatedAt: true },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Activite",
        entityId: activite.id,
        ipAddress: getRequestIp(request) ?? undefined,
        newData: data,
        description: `Activité modifiée: ${activite.code} - ${activite.libelle}`,
      },
    });

    return NextResponse.json(activite);
  } catch (err) {
    console.error("[API] PUT /api/activites/[id] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canDelete = await hasPermission(session.user.id, "activites:delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const activite = await prisma.activite.findUnique({ where: { id }, select: { code: true, libelle: true } });
    if (!activite) {
      return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
    }

    await prisma.activite.delete({ where: { id } });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "Activite",
        entityId: id,
        ipAddress: getRequestIp(request) ?? undefined,
        description: `Activité supprimée: ${activite.code} - ${activite.libelle}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] DELETE /api/activites/[id] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

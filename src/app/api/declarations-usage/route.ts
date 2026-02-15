import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createDeclarationUsageSchema } from "@/validations/declaration-usage.schema";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "declarations_usage:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const marcheId = searchParams.get("marcheId");
  const statut = searchParams.get("statut");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (marcheId) where.marcheId = marcheId;
  if (statut) where.statut = statut;

  try {
    const [list, total] = await Promise.all([
      prisma.declarationUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          marche: { select: { id: true, code: true, libelle: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { lignes: true } },
        },
      }),
      prisma.declarationUsage.count({ where }),
    ]);

    return NextResponse.json({
      data: list.map((d) => ({
        ...d,
        montantRecu: Number(d.montantRecu),
        totalJustifie: Number(d.totalJustifie),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET declarations-usage:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "declarations_usage:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDeclarationUsageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Verify marche exists
    const marche = await prisma.marche.findUnique({
      where: { id: parsed.data.marcheId },
      select: { id: true, code: true, libelle: true },
    });
    if (!marche) {
      return NextResponse.json({ error: "Marché introuvable" }, { status: 404 });
    }

    // Auto-generate reference DU-YYYY-XXXX
    const year = new Date().getFullYear();
    const prefix = `DU-${year}-`;
    const lastDecl = await prisma.declarationUsage.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: "desc" },
      select: { reference: true },
    });
    let nextNum = 1;
    if (lastDecl) {
      const numPart = parseInt(lastDecl.reference.replace(prefix, ""), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    const reference = `${prefix}${String(nextNum).padStart(4, "0")}`;

    // Calculate totalJustifie from lignes
    const totalJustifie = parsed.data.lignes.reduce((sum, l) => sum + l.montant, 0);

    const declaration = await prisma.declarationUsage.create({
      data: {
        marcheId: parsed.data.marcheId,
        reference,
        montantRecu: parsed.data.montantRecu,
        dateReception: new Date(parsed.data.dateReception),
        totalJustifie,
        createdById: session.user.id,
        lignes: {
          create: parsed.data.lignes.map((l) => ({
            libelle: l.libelle,
            montant: l.montant,
          })),
        },
      },
      include: {
        lignes: true,
        marche: { select: { id: true, code: true, libelle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "DeclarationUsage",
        entityId: declaration.id,
        newData: {
          reference,
          marcheId: parsed.data.marcheId,
          montantRecu: parsed.data.montantRecu,
          lignesCount: parsed.data.lignes.length,
        },
        description: `Déclaration d'usage créée: ${reference} - ${parsed.data.montantRecu} - Marché ${marche.code}`,
      },
    });

    return NextResponse.json(
      {
        ...declaration,
        montantRecu: Number(declaration.montantRecu),
        totalJustifie: Number(declaration.totalJustifie),
        lignes: declaration.lignes.map((l) => ({
          ...l,
          montant: Number(l.montant),
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST declaration-usage:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

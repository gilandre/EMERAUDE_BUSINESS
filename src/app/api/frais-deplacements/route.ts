import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createFraisDeplacementSchema } from "@/validations/frais-deplacement.schema";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "frais_deplacement:read");
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
      prisma.fraisDeplacement.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: {
          marche: { select: { id: true, code: true, libelle: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.fraisDeplacement.count({ where }),
    ]);

    return NextResponse.json({
      data: list.map((f) => ({
        ...f,
        montant: Number(f.montant),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET frais-deplacements:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "frais_deplacement:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createFraisDeplacementSchema.safeParse(body);
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

    const frais = await prisma.fraisDeplacement.create({
      data: {
        marcheId: parsed.data.marcheId,
        libelle: parsed.data.libelle,
        montant: parsed.data.montant,
        devise: parsed.data.devise,
        categorie: parsed.data.categorie,
        date: new Date(parsed.data.date),
        description: parsed.data.description ?? null,
        createdById: session.user.id,
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "FraisDeplacement",
        entityId: frais.id,
        newData: {
          marcheId: parsed.data.marcheId,
          libelle: parsed.data.libelle,
          montant: parsed.data.montant,
          categorie: parsed.data.categorie,
        },
        description: `Frais de déplacement créé: ${parsed.data.libelle} - ${parsed.data.montant} ${parsed.data.devise} - Marché ${marche.code}`,
      },
    });

    return NextResponse.json(
      { ...frais, montant: Number(frais.montant) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST frais-deplacement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

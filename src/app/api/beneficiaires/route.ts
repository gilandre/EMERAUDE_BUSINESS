import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createBeneficiaireSchema } from "@/validations/beneficiaire.schema";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "beneficiaires:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;
  const actif = searchParams.get("actif");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { nom: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (actif !== null && actif !== "") {
    where.actif = actif === "true";
  }

  try {
    const [list, total] = await Promise.all([
      prisma.beneficiaire.findMany({
        where,
        orderBy: { nom: "asc" },
        skip,
        take: limit,
      }),
      prisma.beneficiaire.count({ where }),
    ]);

    return NextResponse.json({
      data: list.map((b) => ({
        ...b,
        totalPaye: Number(b.totalPaye),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET beneficiaires:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "beneficiaires:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createBeneficiaireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Auto-generate code BEN-XXXX
    const lastBen = await prisma.beneficiaire.findFirst({
      where: { code: { startsWith: "BEN-" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastBen) {
      const numPart = parseInt(lastBen.code.replace("BEN-", ""), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    const code = `BEN-${String(nextNum).padStart(4, "0")}`;

    const beneficiaire = await prisma.beneficiaire.create({
      data: {
        code,
        nom: parsed.data.nom,
        type: parsed.data.type,
        contact: parsed.data.contact ?? null,
        email: parsed.data.email || null,
        adresse: parsed.data.adresse ?? null,
        modePaiement: parsed.data.modePaiement ?? null,
        banque: parsed.data.banque ?? null,
        compteBancaire: parsed.data.compteBancaire ?? null,
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Beneficiaire",
        entityId: beneficiaire.id,
        newData: { code, nom: parsed.data.nom, type: parsed.data.type },
        description: `Bénéficiaire créé: ${parsed.data.nom} (${code})`,
      },
    });

    return NextResponse.json(
      { ...beneficiaire, totalPaye: Number(beneficiaire.totalPaye) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST beneficiaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

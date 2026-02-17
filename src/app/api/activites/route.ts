import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createActiviteSchema } from "@/validations/activite.schema";
import { getRequestIp } from "@/lib/request-ip";
import { conversionService } from "@/services/devises/conversion.service";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "activites:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type");
  const statut = searchParams.get("statut");
  const deviseCode = searchParams.get("deviseCode");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { libelle: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type) {
    const typeList = type.split(",").filter(Boolean);
    where.type = typeList.length === 1 ? typeList[0] : { in: typeList };
  }
  if (statut) {
    const statutList = statut.split(",").filter(Boolean);
    where.statut = statutList.length === 1 ? statutList[0] : { in: statutList };
  }
  if (deviseCode) where.deviseCode = deviseCode;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const validSortFields = ["code", "libelle", "type", "statut", "solde", "totalEntrees", "totalSorties", "createdAt", "updatedAt"];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "updatedAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const [activites, total] = await Promise.all([
    prisma.activite.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        type: true,
        statut: true,
        deviseCode: true,
        budgetPrevisionnel: true,
        totalEntrees: true,
        totalSorties: true,
        solde: true,
        soldeXOF: true,
        dateDebut: true,
        dateFin: true,
        createdAt: true,
        updatedAt: true,
        responsable: { select: { id: true, name: true, email: true } },
        _count: { select: { mouvements: true } },
      },
    }),
    prisma.activite.count({ where }),
  ]);

  return NextResponse.json({
    data: activites.map((a) => ({
      ...a,
      budgetPrevisionnel: a.budgetPrevisionnel ? Number(a.budgetPrevisionnel) : null,
      totalEntrees: Number(a.totalEntrees),
      totalSorties: Number(a.totalSorties),
      solde: Number(a.solde),
      soldeXOF: Number(a.soldeXOF),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "activites:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createActiviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { libelle, description, type, deviseId, deviseCode: devCode, budgetPrevisionnel, dateDebut, dateFin, responsableId } = parsed.data;

  // Resolve devise
  let resolvedDeviseId = deviseId;
  let resolvedDeviseCode = devCode ?? "XOF";
  if (!resolvedDeviseId) {
    const defaultDevise = await prisma.devise.findFirst({ where: { code: resolvedDeviseCode, isActive: true } });
    if (!defaultDevise) {
      return NextResponse.json({ error: "Devise introuvable" }, { status: 400 });
    }
    resolvedDeviseId = defaultDevise.id;
    resolvedDeviseCode = defaultDevise.code;
  } else {
    const devise = await prisma.devise.findUnique({ where: { id: resolvedDeviseId } });
    if (devise) resolvedDeviseCode = devise.code;
  }

  const tauxChange = await conversionService.getTauxChange(resolvedDeviseCode);
  const tauxChangeNum = Number(tauxChange.toString());

  // Generate unique code ACT-XXXX
  const lastActivite = await prisma.activite.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true } });
  const lastNum = lastActivite?.code ? parseInt(lastActivite.code.replace("ACT-", ""), 10) : 0;
  const code = `ACT-${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(4, "0")}`;

  const budgetXOF = budgetPrevisionnel ? budgetPrevisionnel * tauxChangeNum : null;

  const activite = await prisma.activite.create({
    data: {
      code,
      libelle,
      description: description ?? null,
      type: type ?? "AUTRE",
      deviseId: resolvedDeviseId,
      deviseCode: resolvedDeviseCode,
      tauxChangeCreation: tauxChangeNum,
      budgetPrevisionnel: budgetPrevisionnel ?? null,
      budgetPrevisionnelXOF: budgetXOF,
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      responsableId: responsableId ?? null,
    },
    select: {
      id: true,
      code: true,
      libelle: true,
      type: true,
      statut: true,
      deviseCode: true,
      createdAt: true,
    },
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Activite",
      entityId: activite.id,
      ipAddress: getRequestIp(request) ?? undefined,
      newData: { code, libelle, type },
      description: `Activité créée: ${code} - ${libelle}`,
    },
  });

  return NextResponse.json(activite, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createMarcheSchema } from "@/validations/marche.schema";
import { sanitizeString } from "@/lib/sanitize";
import { consumeRateLimit } from "@/lib/rate-limit";
import { conversionService } from "@/services/devises/conversion.service";
import { cacheGet, cacheSet, cacheDelByPrefix, CACHE_TTL } from "@/lib/cache";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  const rateLimitRes = await consumeRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "marches:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const cacheKey = `marches:${searchParams.toString()}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);
  const q = searchParams.get("q") ?? "";
  const statutParam = searchParams.get("statut") ?? "";
  const statutList = statutParam ? statutParam.split(",").filter(Boolean) : [];
  const deviseParam = searchParams.get("devise") ?? "";
  const deviseList = deviseParam ? deviseParam.split(",").filter(Boolean) : [];
  const tresorerie = searchParams.get("tresorerie") ?? "";
  const prefinancement = searchParams.get("prefinancement") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.MarcheWhereInput = {};
  if (statutList.length > 0) where.statut = { in: statutList };
  if (deviseList.length > 0) where.deviseCode = { in: deviseList };
  if (dateFrom) where.dateDebut = { gte: new Date(dateFrom) };
  if (dateTo) where.dateFin = { lte: new Date(dateTo) };
  if (prefinancement === "avec") {
    where.prefinancement = { isNot: null };
  } else if (prefinancement === "sans") {
    where.prefinancement = null;
  }
  if (q.trim()) {
    const search = q.trim();
    where.OR = [
      { code: { contains: search, mode: "insensitive" as const } },
      { libelle: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const orderBy: Prisma.MarcheOrderByWithRelationInput =
    sortBy === "libelle" ? { libelle: sortOrder } :
    sortBy === "montant" ? { montantTotal: sortOrder } :
    sortBy === "dateFin" ? { dateFin: sortOrder } :
    { updatedAt: sortOrder };

  const needTresorerieFilter = tresorerie === "critique" || tresorerie === "faible" || tresorerie === "saine";
  const fetchLimit = needTresorerieFilter ? 500 : pageSize;
  const fetchSkip = needTresorerieFilter ? 0 : skip;

  const [data, totalBeforeTreso] = await Promise.all([
    prisma.marche.findMany({
      where,
      orderBy,
      skip: fetchSkip,
      take: fetchLimit,
      select: {
        id: true,
        code: true,
        libelle: true,
        montantTotal: true,
        montantTotalXOF: true,
        montantEncaisse: true,
        montantDecaisse: true,
        tresorerieDisponible: true,
        deviseCode: true,
        statut: true,
        dateDebut: true,
        dateFin: true,
        updatedAt: true,
        _count: { select: { accomptes: true, decaissements: true } },
        prefinancement: { select: { montant: true, montantUtilise: true } },
      },
    }),
    needTresorerieFilter ? 0 : prisma.marche.count({ where }),
  ]);

  let items = data.map((m) => {
    const montantTotal = Number(m.montantTotal);
    const montantEncaisse = Number(m.montantEncaisse);
    const montantDecaisse = Number(m.montantDecaisse);
    const treso = Number(m.tresorerieDisponible);
    const ratioTreso = montantTotal > 0 ? (treso / montantTotal) * 100 : 0;
    const ratioEncaisse = montantTotal > 0 ? (montantEncaisse / montantTotal) * 100 : 0;
    return {
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      montant: montantTotal,
      montantTotalXOF: Number(m.montantTotalXOF),
      montantEncaisse,
      montantDecaisse,
      tresorerie: treso,
      ratioTreso,
      ratioEncaisse,
      deviseCode: m.deviseCode,
      statut: m.statut,
      dateDebut: m.dateDebut,
      dateFin: m.dateFin,
      updatedAt: m.updatedAt,
      _count: m._count,
      hasPrefinancement: !!m.prefinancement,
    };
  });

  if (tresorerie === "critique") {
    items = items.filter((m) => m.ratioTreso < 10);
  } else if (tresorerie === "faible") {
    items = items.filter((m) => m.ratioTreso >= 10 && m.ratioTreso < 30);
  } else if (tresorerie === "saine") {
    items = items.filter((m) => m.ratioTreso >= 30);
  }

  const total = needTresorerieFilter ? items.length : (totalBeforeTreso as number);
  const paginatedItems = needTresorerieFilter ? items.slice(skip, skip + pageSize) : items;

  const includeCounts = searchParams.get("counts") === "true";
  let counts: Record<string, number> | undefined;
  if (includeCounts) {
    const [byStatut, byDevise, withPref, all] = await Promise.all([
      prisma.marche.groupBy({ by: ["statut"], _count: true, where }),
      prisma.marche.groupBy({ by: ["deviseCode"], _count: true, where }),
      prisma.marche.count({ where: { ...where, prefinancement: { isNot: null } } }),
      prisma.marche.count({ where }),
    ]);
    const statutCounts: Record<string, number> = {};
    byStatut.forEach((s) => { statutCounts[s.statut] = s._count; });
    const deviseCounts: Record<string, number> = {};
    byDevise.forEach((d) => { deviseCounts[d.deviseCode] = d._count; });
    counts = {
      actif: statutCounts.actif ?? 0,
      termine: statutCounts.termine ?? 0,
      suspendu: statutCounts.suspendu ?? 0,
      ...deviseCounts,
      avecPrefinancement: withPref,
      sansPrefinancement: all - withPref,
    };
  }

  const payload = {
    data: paginatedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    counts,
  };

  await cacheSet(cacheKey, payload, CACHE_TTL.MARCHES_LIST);
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const rateLimitRes = await consumeRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "marches:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMarcheSchema.safeParse({
    ...body,
    montant: body.montant != null ? Number(body.montant) : 0,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, libelle, montant, deviseId, deviseCode, dateDebut, dateFin, statut } = parsed.data;
  const montantVal = montant ?? 0;

  const deviseParDefaut = await conversionService.getDeviseParDefaut();
  const deviseIdFinal = deviseId ?? deviseParDefaut.id;
  const codeDevise = deviseCode ?? deviseParDefaut.code;

  const tauxChange = await conversionService.getTauxChange(codeDevise);
  const montantTotalXOF = await conversionService.convertirVersXOF(montantVal, codeDevise);

  void cacheDelByPrefix("marches");

  const marche = await prisma.marche.create({
    data: {
      code: sanitizeString(code ?? `M${Date.now()}`, 50),
      libelle: sanitizeString(libelle ?? "Nouveau marché", 255),
      deviseId: deviseIdFinal,
      deviseCode: codeDevise,
      montantTotal: montantVal,
      montantTotalXOF: Number(montantTotalXOF.toString()),
      montantEncaisse: 0,
      montantDecaisse: 0,
      tresorerieDisponible: montantVal,
      montantEncaisseXOF: 0,
      montantDecaisseXOF: 0,
      tresorerieDisponibleXOF: Number(montantTotalXOF.toString()),
      tauxChangeCreation: Number(tauxChange.toString()),
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      statut: statut ?? "actif",
    },
  });

  void prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Marche",
      entityId: marche.id,
      ipAddress: getRequestIp(request) ?? undefined,
      newData: { code: marche.code, libelle: marche.libelle, montant: Number(marche.montantTotal) },
      description: `Marché créé: ${marche.libelle} (${marche.code})`,
    },
  });

  try {
    const { dispatchAlertEvent } = await import("@/lib/alert-events");
    void dispatchAlertEvent(
      "MARCHE_CREE",
      {
        marcheId: marche.id,
        marcheCode: marche.code,
        libelleMarche: marche.libelle,
        deviseCode: marche.deviseCode ?? "XOF",
        montant: Number(marche.montantTotal),
        message: `Marché créé : ${marche.libelle} (${marche.code})`,
      },
      { inAppUserId: session.user.id, sync: true }
    );
  } catch {
    // ignore
  }

  return NextResponse.json(
    { ...marche, montant: Number(marche.montantTotal), deviseCode: marche.deviseCode },
    { status: 201 }
  );
}

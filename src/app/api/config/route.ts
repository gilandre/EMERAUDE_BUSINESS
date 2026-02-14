import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { cacheDel } from "@/lib/cache";

const CONFIG_CACHE_KEY = "config:all";

// GET /api/config - Liste toutes les configs (admin)
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "config:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.config.findMany({
    orderBy: { module: "asc" },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      cle: r.cle,
      valeur: r.valeur,
      type: r.type,
      module: r.module,
      description: r.description,
      updatedAt: r.updatedAt,
    }))
  );
}

// PUT /api/config - Créer ou mettre à jour une config
export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { cle, valeur, type, module, description } = body;

  if (!cle || typeof cle !== "string" || cle.trim() === "") {
    return NextResponse.json(
      { error: "Clé requise" },
      { status: 400 }
    );
  }

  const updated = await prisma.config.upsert({
    where: { cle: cle.trim() },
    create: {
      cle: cle.trim(),
      valeur: String(valeur ?? ""),
      type: type ?? "string",
      module: module ?? null,
      description: description ?? null,
    },
    update: {
      valeur: String(valeur ?? ""),
      ...(type !== undefined && { type }),
      ...(module !== undefined && { module }),
      ...(description !== undefined && { description }),
    },
  });

  await cacheDel(CONFIG_CACHE_KEY);

  return NextResponse.json({
    id: updated.id,
    cle: updated.cle,
    valeur: updated.valeur,
    type: updated.type,
    module: updated.module,
    description: updated.description,
    updatedAt: updated.updatedAt,
  });
}

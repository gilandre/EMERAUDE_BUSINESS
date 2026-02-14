import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const createDashboardSchema = z.object({
  code: z.string().min(1).max(50),
  libelle: z.string().min(1).max(200),
  config: z.record(z.unknown()).optional().nullable(),
  profilId: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  ordre: z.number().int().min(0).default(0),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "dashboards:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dashboards = await prisma.dashboard.findMany({
    orderBy: [{ ordre: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      libelle: true,
      config: true,
      profilId: true,
      userId: true,
      isDefault: true,
      ordre: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: dashboards });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate = await hasPermission(session.user.id, "dashboards:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.dashboard.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json({ error: "Un tableau de bord avec ce code existe déjà" }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.dashboard.updateMany({
      data: { isDefault: false },
    });
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      code: parsed.data.code,
      libelle: parsed.data.libelle,
      config: (parsed.data.config ?? {}) as object,
      profilId: parsed.data.profilId ?? null,
      isDefault: parsed.data.isDefault,
      ordre: parsed.data.ordre,
    },
  });

  return NextResponse.json(dashboard, { status: 201 });
}

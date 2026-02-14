import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const updateDashboardSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  libelle: z.string().min(1).max(200).optional(),
  config: z.record(z.unknown()).optional().nullable(),
  profilId: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  ordre: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "dashboards:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Tableau de bord non trouvé" }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "dashboards:update");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) {
    return NextResponse.json({ error: "Tableau de bord non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.code && parsed.data.code !== dashboard.code) {
    const existing = await prisma.dashboard.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json({ error: "Un tableau de bord avec ce code existe déjà" }, { status: 400 });
    }
  }

  if (parsed.data.isDefault) {
    await prisma.dashboard.updateMany({
      data: { isDefault: false },
    });
  }

  const updated = await prisma.dashboard.update({
    where: { id },
    data: {
      ...(parsed.data.code && { code: parsed.data.code }),
      ...(parsed.data.libelle && { libelle: parsed.data.libelle }),
      ...(parsed.data.config !== undefined && { config: parsed.data.config as object }),
      profilId: parsed.data.profilId ?? dashboard.profilId,
      ...(parsed.data.isDefault !== undefined && { isDefault: parsed.data.isDefault }),
      ...(parsed.data.ordre !== undefined && { ordre: parsed.data.ordre }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await hasPermission(session.user.id, "dashboards:update");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) {
    return NextResponse.json({ error: "Tableau de bord non trouvé" }, { status: 404 });
  }

  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

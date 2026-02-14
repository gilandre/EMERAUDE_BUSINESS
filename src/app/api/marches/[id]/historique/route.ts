import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "marches:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: marcheId } = await params;

  const marche = await prisma.marche.findUnique({
    where: { id: marcheId },
    select: {
      id: true,
      accomptes: { select: { id: true } },
      decaissements: { select: { id: true } },
    },
  });

  if (!marche) {
    return NextResponse.json({ error: "Marché introuvable" }, { status: 404 });
  }

  const acompteIds = marche.accomptes.map((a) => a.id);
  const decaissementIds = marche.decaissements.map((d) => d.id);

  const orConditions: Array<Record<string, unknown>> = [
    { entity: "Marche", entityId: marcheId },
  ];
  if (acompteIds.length > 0) {
    orConditions.push({ entity: "Accompte", entityId: { in: acompteIds } });
  }
  if (decaissementIds.length > 0) {
    orConditions.push({ entity: "Decaissement", entityId: { in: decaissementIds } });
  }

  const logs = await prisma.auditLog.findMany({
    where: { OR: orConditions },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      description: true,
      oldData: true,
      newData: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json(
    logs.map((l) => {
      const { user, ...rest } = l;
      return {
        ...rest,
        userEmail: (user as { email?: string })?.email,
        userName: (user as { name?: string })?.name,
      };
    })
  );
}

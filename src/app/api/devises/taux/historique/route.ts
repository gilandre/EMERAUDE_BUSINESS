import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "config:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const deviseCode = searchParams.get("deviseCode");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const where: { deviseSourceCode?: string } = {};
  if (deviseCode) where.deviseSourceCode = deviseCode;

  const taux = await prisma.tauxChange.findMany({
    where,
    orderBy: { dateDebut: "desc" },
    take: limit,
    include: {
      deviseSource: { select: { code: true, symbole: true } },
    },
  });

  return NextResponse.json(
    taux.map((t) => ({
      ...t,
      taux: Number(t.taux),
      dateDebut: t.dateDebut.toISOString(),
      dateFin: t.dateFin?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}

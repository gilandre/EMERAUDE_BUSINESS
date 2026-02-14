import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";

  if (all) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canRead = await hasPermission(session.user.id, "config:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const devises = await prisma.devise.findMany({
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
    return NextResponse.json(
      devises.map((d) => ({
        ...d,
        tauxVersXOF: Number(d.tauxVersXOF),
      }))
    );
  }

  const devises = await prisma.devise.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });

  return NextResponse.json(
    devises.map((d) => ({
      ...d,
      tauxVersXOF: Number(d.tauxVersXOF),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { code, nom, symbole, tauxVersXOF = 1, isActive = true, decimales = 2 } = body;

  if (!code || !nom || !symbole) {
    return NextResponse.json(
      { error: "code, nom et symbole requis" },
      { status: 400 }
    );
  }

  const existing = await prisma.devise.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Une devise avec ce code existe déjà" }, { status: 400 });
  }

  const devise = await prisma.devise.create({
    data: {
      code,
      nom,
      symbole,
      tauxVersXOF: Number(tauxVersXOF) || 1,
      isActive: !!isActive,
      decimales: Number(decimales) ?? 2,
      pays: body.pays ?? [],
    },
  });

  return NextResponse.json(
    { ...devise, tauxVersXOF: Number(devise.tauxVersXOF) },
    { status: 201 }
  );
}

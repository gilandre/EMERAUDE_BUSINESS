import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      nom: true,
      prenom: true,
      totpEnabled: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { nom, prenom } = body as { nom?: string; prenom?: string };

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(nom !== undefined && { nom: nom.trim() }),
      ...(prenom !== undefined && { prenom: prenom.trim() }),
      ...(nom !== undefined || prenom !== undefined
        ? { name: [prenom?.trim(), nom?.trim()].filter(Boolean).join(" ") || null }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      nom: true,
      prenom: true,
    },
  });

  return NextResponse.json(user);
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Code TOTP requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Exécutez d'abord /api/totp/setup" }, { status: 400 });
  }
  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA déjà activé" }, { status: 400 });
  }

  const valid = verifyToken(user.totpSecret, token.replace(/\s/g, ""));
  if (!valid) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return NextResponse.json({ success: true, message: "2FA activé" });
}

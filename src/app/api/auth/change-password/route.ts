import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getRequestIp } from "@/lib/request-ip";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Mot de passe actuel et nouveau requis" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Compte non configuré" },
      { status: 400 }
    );
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword,
      mustChangePassword: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Mot de passe changé par l'utilisateur ${user.email}`,
    },
  });

  return NextResponse.json({ success: true, message: "Mot de passe modifié avec succès" });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { randomBytes } from "crypto";
import { emailService } from "@/services/alerting/email.service";
import { getRequestIp } from "@/lib/request-ip";

const TOKEN_EXPIRY_HOURS = 24;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "users:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, nom: true, prenom: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Generate reset token
  const token = randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  // Clean old tokens and create new one
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });
  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires },
  });

  // Set mustChangePassword flag
  await prisma.user.update({
    where: { id },
    data: { mustChangePassword: true },
  });

  // Send email with reset link
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  const displayName = [user.prenom, user.nom].filter(Boolean).join(" ") || user.email;

  const html = `
    <h2>Réinitialisation de votre mot de passe</h2>
    <p>Bonjour ${displayName},</p>
    <p>Un administrateur a demandé la réinitialisation de votre mot de passe Emeraude Business.</p>
    <p>Cliquez sur le lien ci-dessous pour définir votre nouveau mot de passe (valide ${TOKEN_EXPIRY_HOURS}h) :</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p><strong>Après la réinitialisation, vous devrez changer votre mot de passe à la première connexion.</strong></p>
  `;

  try {
    await emailService.send(
      user.email,
      "Réinitialisation mot de passe - Emeraude Business",
      html
    );
  } catch (err) {
    // Log but don't fail — token is created, admin can share link manually
    console.error("Failed to send reset email:", err);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: id,
      ipAddress: getRequestIp(request) ?? undefined,
      description: `Réinitialisation mot de passe demandée pour ${user.email}`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Lien de réinitialisation envoyé à ${user.email}`,
    resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { emailService } from "@/services/alerting/email.service";

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "Si cet email existe, un lien de réinitialisation vous sera envoyé." },
        { status: 200 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { message: "Si cet email existe, un lien de réinitialisation vous sera envoyé." },
        { status: 200 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const html = `
      <h2>Réinitialisation du mot de passe</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe Emeraude Business.</p>
      <p>Cliquez sur le lien ci-dessous (valide ${TOKEN_EXPIRY_HOURS}h) :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `;

    await emailService.send(email, "Réinitialisation mot de passe - Emeraude Business", html);
  } catch {
    // Ne pas révéler si l'email existe ou non
  }

  return NextResponse.json({
    message: "Si cet email existe, un lien de réinitialisation vous sera envoyé.",
  });
}

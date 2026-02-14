import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Token, email et mot de passe (min. 8 caractères) requis" },
        { status: 400 }
      );
    }

    const vt = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } },
    });

    if (!vt || vt.expires < new Date()) {
      return NextResponse.json(
        { error: "Lien expiré ou invalide. Demandez un nouveau lien." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash, updatedAt: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      }),
    ]);

    return NextResponse.json({ message: "Mot de passe réinitialisé. Vous pouvez vous connecter." });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-me"
);

export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide ou manquant" },
        { status: 400 }
      );
    }
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: {
        profil: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Compte non configuré pour la connexion" },
        { status: 401 }
      );
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      return NextResponse.json(
        { error: "Compte temporairement verrouillé" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(String(password), user.passwordHash);

    if (!isValid) {
      const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockThreshold = 5;
      const lockMinutes = 15;
      const updates: { failedLoginAttempts: number; lockedUntil?: Date } = {
        failedLoginAttempts: failedAttempts,
      };
      if (failedAttempts >= lockThreshold) {
        const lockedUntil = new Date(now);
        lockedUntil.setMinutes(lockedUntil.getMinutes() + lockMinutes);
        updates.lockedUntil = lockedUntil;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      return NextResponse.json(
        { error: failedAttempts >= lockThreshold ? "Compte verrouillé" : "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    });

    const token = await new jose.SignJWT({
      sub: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(JWT_SECRET);

    const permissions = user.profil?.permissions?.map((p) => p.permission.code) ?? [];

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nom: user.nom,
        prenom: user.prenom,
        permissions,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}

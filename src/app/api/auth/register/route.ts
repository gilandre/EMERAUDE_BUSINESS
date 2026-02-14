import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  nom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  if (process.env.ALLOW_REGISTRATION === "false") {
    return NextResponse.json(
      { error: "L'inscription est désactivée" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { error: first?.message ?? "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 400 }
    );
  }

  const profilUser = await prisma.profil.findUnique({
    where: { code: "USER" },
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const name = [parsed.data.prenom, parsed.data.nom].filter(Boolean).join(" ").trim() || null;

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      nom: parsed.data.nom ?? null,
      prenom: parsed.data.prenom ?? null,
      name,
      profilId: profilUser?.id ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      nom: true,
      prenom: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { message: "Compte créé. Vous pouvez vous connecter.", user },
    { status: 201 }
  );
}

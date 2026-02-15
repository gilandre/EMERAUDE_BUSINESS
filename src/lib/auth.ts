import { NextRequest } from "next/server";
import { NextAuthOptions } from "next-auth";
import { getSessionForApi } from "./auth-mobile";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Identifiants manquants");
        }

        const getIp = () => {
          const headers = (req as { headers?: Headers })?.headers;
          if (!headers) return null;
          const forwarded = headers.get?.("x-forwarded-for");
          if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
          return headers.get?.("x-real-ip") ?? null;
        };
        const ipAddress = getIp();

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            profil: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        });

        if (!user) {
          throw new Error("Utilisateur non trouvé");
        }

        if (!user.passwordHash) {
          throw new Error("Compte non configuré pour la connexion par mot de passe");
        }

        const now = new Date();
        if (user.lockedUntil && user.lockedUntil > now) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "LOGIN_FAILED",
              entity: "User",
              entityId: user.id,
              ipAddress: ipAddress ?? undefined,
              description: "Tentative de connexion - compte verrouillé",
            },
          });
          throw new Error(
            `Compte verrouillé jusqu'au ${user.lockedUntil.toLocaleTimeString("fr-FR")}. Réessayez plus tard.`
          );
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

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

          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: updates,
            }),
            prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "LOGIN_FAILED",
                entity: "User",
                entityId: user.id,
                ipAddress: ipAddress ?? undefined,
                description: "Tentative de connexion échouée",
              },
            }),
          ]);

          throw new Error(
            failedAttempts >= lockThreshold
              ? `Compte verrouillé pour ${lockMinutes} minutes après ${lockThreshold} tentatives échouées.`
              : "Mot de passe incorrect"
          );
        }

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
          }),
          prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "LOGIN",
              entity: "User",
              entityId: user.id,
              ipAddress: ipAddress ?? undefined,
              description: "Connexion réussie",
            },
          }),
        ]);

        return {
          id: user.id,
          email: user.email,
          nom: user.nom ?? undefined,
          prenom: user.prenom ?? undefined,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.mustChangePassword = (user as unknown as Record<string, unknown>).mustChangePassword === true;
      }
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        });
        token.mustChangePassword = dbUser?.mustChangePassword === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
};

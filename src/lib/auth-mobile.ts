import * as jose from "jose";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-me"
);

export interface MobileSession {
  user: { id: string; email?: string | null; name?: string | null };
  expires?: string;
}

export async function getSessionForApi(request: Request): Promise<MobileSession | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    try {
      const { payload } = await jose.jwtVerify(bearerToken, JWT_SECRET);
      const sub = payload.sub;
      if (!sub) return null;

      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, email: true, name: true },
      });

      if (!user) return null;

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch {
      return null;
    }
  }

  return null;
}

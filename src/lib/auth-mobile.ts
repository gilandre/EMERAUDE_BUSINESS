import * as jose from "jose";
import { prisma } from "./prisma";
import { cacheGet, cacheSet } from "./cache";

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

      const cacheKey = `mobile-session:${sub}`;
      const cached = await cacheGet<MobileSession>(cacheKey);
      if (cached) return cached;

      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, email: true, name: true },
      });

      if (!user) return null;

      const session: MobileSession = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };

      await cacheSet(cacheKey, session, 300);
      return session;
    } catch {
      return null;
    }
  }

  return null;
}

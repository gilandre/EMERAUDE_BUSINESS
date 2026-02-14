import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";
import { consumeRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expireDays: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const rateLimitRes = await consumeRateLimit(req);
  if (rateLimitRes) return rateLimitRes;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const canManage = await hasPermission(session.user.id, "config:update");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      expireAt: true,
      lastUsedAt: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const rateLimitRes = await consumeRateLimit(req);
  if (rateLimitRes) return rateLimitRes;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const canManage = await hasPermission(session.user.id, "config:update");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, scopes, expireDays } = parsed.data;
  const expireAt = expireDays ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : undefined;

  const result = await createApiKey(name, scopes, expireAt);
  return NextResponse.json({
    ...result,
    warning: "Conservez la clé : elle ne sera plus affichée.",
  });
}

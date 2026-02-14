import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/cache";
import { withApiMetrics, type RouteContext } from "@/lib/api-metrics";

const MENUS_CACHE_KEY = (userId: string) => `menus:${userId}`;

async function getHandler(_req: Request, _ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cached = await cacheGet<unknown[]>(MENUS_CACHE_KEY(session.user.id));
  if (cached) return NextResponse.json(cached);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { profilId: true },
  });

  if (!user?.profilId) {
    return NextResponse.json([]);
  }

  const [profilMenus, permissions, allMenus] = await Promise.all([
    prisma.profilMenu.findMany({
      where: { profilId: user.profilId },
      select: { menuId: true },
    }),
    getUserPermissions(session.user.id),
    prisma.menu.findMany({
      where: { active: true },
      orderBy: { ordre: "asc" },
      select: {
        id: true,
        code: true,
        libelle: true,
        path: true,
        icon: true,
        ordre: true,
        parentId: true,
        permission: true,
      },
    }),
  ]);

  const menuIds = new Set(profilMenus.map((pm) => pm.menuId));
  const filtered = allMenus.filter((m) => {
    if (!menuIds.has(m.id)) return false;
    if (!m.permission) return true;
    return permissions.includes(m.permission) || permissions.includes("*");
  });

  const byParent = new Map<string | null, typeof filtered>();
  for (const m of filtered) {
    const key = m.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }

  const tree = (parentId: string | null): { id: string; code: string; libelle: string; path: string | null; icon: string | null; ordre: number; children: unknown[] }[] =>
    (byParent.get(parentId) ?? []).map((m) => ({
      id: m.id,
      code: m.code,
      libelle: m.libelle,
      path: m.path,
      icon: m.icon,
      ordre: m.ordre,
      children: tree(m.id),
    }));

  const result = tree(null);
  await cacheSet(MENUS_CACHE_KEY(session.user.id), result, CACHE_TTL.MENUS);
  return NextResponse.json(result);
}

export const GET = withApiMetrics(getHandler, "api/menus");

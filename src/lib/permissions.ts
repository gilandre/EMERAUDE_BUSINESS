import { prisma } from "./prisma";
import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from "./cache";

const PERMISSIONS_CACHE_KEY = (userId: string) => `permissions:${userId}`;

export async function hasPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode) || permissions.includes("*");
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = await cacheGet<string[]>(PERMISSIONS_CACHE_KEY(userId));
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      profilId: true,
      profil: {
        select: {
          permissions: {
            select: { permission: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!user?.profil) return [];

  const permissions = [
    ...new Set(
      user.profil.permissions.map((pp) => pp.permission.code)
    ),
  ];
  await cacheSet(PERMISSIONS_CACHE_KEY(userId), permissions, CACHE_TTL.PERMISSIONS);
  return permissions;
}

/** Invalide le cache des permissions d'un utilisateur (ex. après changement de profil) */
export async function invalidatePermissionsCache(userId: string): Promise<void> {
  await cacheDel(PERMISSIONS_CACHE_KEY(userId));
}

/** Invalide le cache des permissions et menus de tous les utilisateurs ayant ce profil (ex. après modification des permissions du profil) */
export async function invalidatePermissionsCacheForProfil(profilId: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { profilId },
    select: { id: true },
  });
  await Promise.all(
    users.flatMap((u) => [
      cacheDel(PERMISSIONS_CACHE_KEY(u.id)),
      cacheDel(`menus:${u.id}`),
    ])
  );
}

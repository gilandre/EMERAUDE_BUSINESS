"use client";

import { useMemo } from "react";

export type Permission = string;

function hasPerm(perms: string[], p: string): boolean {
  return perms.includes(p) || perms.includes("*");
}

function hasAnyPerm(perms: string[], codes: string[]): boolean {
  return codes.some((c) => hasPerm(perms, c));
}

function hasAllPerms(perms: string[], codes: string[]): boolean {
  return codes.every((c) => hasPerm(perms, c));
}

export function usePermissions(userPermissions: Permission[] = []) {
  return useMemo(
    () => ({
      has: (p: Permission) => hasPerm(userPermissions, p),
      hasAny: (p: Permission[]) => hasAnyPerm(userPermissions, p),
      hasAll: (p: Permission[]) => hasAllPerms(userPermissions, p),
    }),
    [userPermissions]
  );
}

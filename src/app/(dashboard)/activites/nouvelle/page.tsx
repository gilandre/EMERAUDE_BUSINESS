"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiviteForm } from "@/components/activites/ActiviteForm";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function NouvelleActivitePage() {
  const { data: permsData, isLoading: permsLoading } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/permissions");
      if (!res.ok) return { permissions: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const perms = usePermissions((permsData?.permissions ?? []) as string[]);

  if (permsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!perms.has("activites:create")) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Permission refusée</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Vous n&apos;avez pas la permission de créer une activité. Contactez votre administrateur pour obtenir l&apos;accès.
          </p>
          <Link href="/activites">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Nouvelle activité</h1>
        <Link href="/activites">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
      <ActiviteForm mode="create" />
    </div>
  );
}

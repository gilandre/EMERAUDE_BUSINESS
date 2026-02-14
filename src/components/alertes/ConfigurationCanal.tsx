"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CanalConfig {
  id?: string;
  canal: string;
  isEnabled: boolean;
  hasCredentials: boolean;
  config: object | null;
  createdAt?: string;
  updatedAt?: string;
}

export function ConfigurationCanal() {
  const queryClient = useQueryClient();

  const { data: canaux, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["alertes-canaux"],
    queryFn: async () => {
      const res = await fetch("/api/alertes/canaux");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement canaux");
      }
      return res.json() as Promise<CanalConfig[]>;
    },
    retry: 1,
  });

  const updateCanal = useMutation({
    mutationFn: async ({ canal, isEnabled }: { canal: string; isEnabled: boolean }) => {
      const res = await fetch("/api/alertes/canaux", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal, isEnabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur mise à jour");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertes-canaux"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error?.message ?? "Erreur de chargement"}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {canaux?.map((c) => (
        <Card key={c.canal}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">{c.canal}</CardTitle>
            <Badge variant={c.isEnabled ? "default" : "secondary"}>
              {c.isEnabled ? "Activé" : "Désactivé"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              {c.hasCredentials ? "Credentials configurées" : "Credentials non configurées"}
            </CardDescription>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={c.isEnabled ? "outline" : "default"}
                onClick={() => updateCanal.mutate({ canal: c.canal, isEnabled: !c.isEnabled })}
                disabled={updateCanal.isPending}
              >
                {c.isEnabled ? "Désactiver" : "Activer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pour configurer les credentials (SMTP, Twilio, etc.), utilisez l&apos;API PUT
              /api/alertes/canaux avec le body complet.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

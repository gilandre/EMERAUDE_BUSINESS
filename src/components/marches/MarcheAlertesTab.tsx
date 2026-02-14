"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface MarcheAlertesTabProps {
  marcheId: string;
}

interface AlerteRegle {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  active: boolean;
  regle: unknown;
  seuils: unknown;
}

interface NotificationHisto {
  id: string;
  sujet: string | null;
  corps: string;
  envoyee: boolean;
  createdAt: string;
  alerte?: { libelle: string };
}

export function MarcheAlertesTab({ marcheId }: MarcheAlertesTabProps) {
  const { data: regles, isLoading } = useQuery<AlerteRegle[]>({
    queryKey: ["alertes-regles"],
    queryFn: async () => {
      const res = await fetch("/api/alertes/regles");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: historique } = useQuery<NotificationHisto[]>({
    queryKey: ["alertes-historique", marcheId],
    queryFn: async () => {
      const res = await fetch(`/api/alertes/historique?pageSize=20&marcheId=${marcheId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data ?? [];
    },
    enabled: !!marcheId,
  });

  const reglesActives = regles?.filter((r) => r.active) ?? [];
  const reglesMarche = reglesActives.filter((r) => {
    const regle = r.regle as { marcheId?: string } | null;
    return !regle?.marcheId || regle.marcheId === marcheId;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Règles d&apos;alertes actives</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alertes configurées et actives pour ce marché
          </p>
        </CardHeader>
        <CardContent>
          {reglesMarche.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune règle d&apos;alerte spécifique à ce marché.
            </p>
          ) : (
            <div className="space-y-2">
              {reglesMarche.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{r.libelle}</p>
                    {r.description && (
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des alertes déclenchées</CardTitle>
        </CardHeader>
        <CardContent>
          {!historique || historique.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune alerte déclenchée récemment.
            </p>
          ) : (
            <div className="space-y-2">
              {historique.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">{n.sujet ?? "Alerte"}</p>
                  <p className="text-muted-foreground line-clamp-2">{n.corps}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(n.createdAt)} •{" "}
                    {n.envoyee ? "Envoyée" : "En attente"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration alertes personnalisées</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créez des règles d&apos;alertes personnalisées pour ce marché
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Accédez au module Alertes pour configurer des règles (trésorerie
            faible, échéance, etc.).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

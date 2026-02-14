"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarcheHistoriqueTabProps {
  marcheId: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
  user?: { email?: string; name?: string };
  userEmail?: string;
  userName?: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

export function MarcheHistoriqueTab({ marcheId }: MarcheHistoriqueTabProps) {
  const { data: logs, isLoading, isError, error, refetch } = useQuery<AuditLog[]>({
    queryKey: ["marche-historique", marcheId],
    queryFn: async () => {
      const res = await fetch(`/api/marches/${marcheId}/historique`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement historique");
      }
      return res.json();
    },
    enabled: !!marcheId,
  });

  const handleExport = () => {
    const lines = [
      "Date;Action;Entité;Utilisateur;Description",
      ...(logs ?? []).map(
        (l) =>
          `${l.createdAt};${l.action};${l.entity};${l.userEmail ?? l.user?.email ?? "-"};${(l.description ?? "").replace(/;/g, ",")}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-marche-${marcheId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-destructive">{error?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = logs ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timeline complète - Audit trail</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileDown className="h-4 w-4 mr-1" />
          Exporter
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement enregistré</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              {items.map((log) => (
                <div key={log.id} className="relative pl-12 pb-6 last:pb-0">
                  <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-primary/80 border-2 border-background" />
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {log.entity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-sm mt-1">{log.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Par {(log.userName ?? log.user?.name ?? log.userEmail ?? log.user?.email) ?? "Système"}
                    </p>
                    {log.oldData && typeof log.oldData === "object" && Object.keys(log.oldData as object).length > 0 && (
                      <div className="mt-2 text-xs bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Avant:</span>{" "}
                        <code>{JSON.stringify(log.oldData ?? {})}</code>
                      </div>
                    )}
                    {log.newData && typeof log.newData === "object" && Object.keys(log.newData as object).length > 0 && (
                      <div className="mt-1 text-xs bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Après:</span>{" "}
                        <code>{JSON.stringify(log.newData ?? {})}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

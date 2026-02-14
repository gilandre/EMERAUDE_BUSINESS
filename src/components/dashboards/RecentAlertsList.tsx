"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

interface Alerte {
  id: string;
  sujet: string | null;
  libelle: string;
  createdAt: Date | string;
}

interface RecentAlertsListProps {
  alerts: Alerte[];
}

function formatRelative(t: Date | string): string {
  const d = new Date(t);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffJ = Math.floor(diffMs / 86400000);
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffJ < 7) return `Il y a ${diffJ}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function RecentAlertsList({ alerts }: RecentAlertsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          🔔 Alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune alerte récente
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-md border p-2">
                <p className="font-medium text-sm">{a.sujet || a.libelle}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelative(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

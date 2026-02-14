"use client";

"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export interface AlerteItem {
  id: string;
  type: "warning" | "info" | "deadline";
  libelle: string;
  date?: string;
  detail?: string;
}

interface AlertesActivesWidgetProps {
  alertes: AlerteItem[];
  marcheId: string;
}

export function AlertesActivesWidget({
  alertes,
  marcheId,
}: AlertesActivesWidgetProps) {
  const router = useRouter();
  const displayAlertes = alertes.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">⚠️ ALERTES ACTIVES</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayAlertes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune alerte active</p>
        ) : (
          <div className="space-y-3">
            {displayAlertes.map((a) => (
              <div
                key={a.id}
                className="rounded-md border p-3 text-sm space-y-1"
              >
                <div className="flex items-start gap-2">
                  <span>
                    {a.type === "deadline" ? "📅" : a.type === "warning" ? "🟡" : "🔵"}
                  </span>
                  <div>
                    <p className="font-medium">{a.libelle}</p>
                    {a.detail && (
                      <p className="text-muted-foreground text-xs">{a.detail}</p>
                    )}
                    {a.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.date}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/marches/${marcheId}?tab=alertes`)}
        >
          Voir toutes les alertes
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export interface TresorerieWidgetProps {
  totalEncaissements: number;
  totalDecaissements: number;
  solde: number;
  prefinancementMax?: number;
  prefinancementUtilise?: number;
}

export function TresorerieWidget({
  totalEncaissements,
  totalDecaissements,
  solde,
  prefinancementMax = 0,
  prefinancementUtilise = 0,
}: TresorerieWidgetProps) {
  const prefinancementDispo = Math.max(0, prefinancementMax - prefinancementUtilise);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trésorerie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Encaissements</span>
          <span className="font-medium text-green-600">
            +{formatCurrency(totalEncaissements)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Décaissements</span>
          <span className="font-medium text-red-600">
            -{formatCurrency(totalDecaissements)}
          </span>
        </div>
        {prefinancementMax > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Préfinancement disponible</span>
            <span>{formatCurrency(prefinancementDispo)}</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Solde</span>
          <span className={solde >= 0 ? "text-green-600" : "text-red-600"}>
            {formatCurrency(solde)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MontantDisplay } from "@/components/devises/MontantDisplay";

interface RatioFinancierWidgetProps {
  totalEncaissements: number;
  totalDecaissements: number;
  budget: number;
  margeBrute: number;
  deviseCode: string;
  objectifMarge?: number; // en %
}

export function RatioFinancierWidget({
  totalEncaissements,
  totalDecaissements,
  budget,
  margeBrute,
  deviseCode,
  objectifMarge = 30,
}: RatioFinancierWidgetProps) {
  const tauxEncaissement = budget > 0 ? (totalEncaissements / budget) * 100 : 0;
  const tauxDecaissement = budget > 0 ? (totalDecaissements / budget) * 100 : 0;
  const tauxMarge =
    totalEncaissements > 0 ? (margeBrute / totalEncaissements) * 100 : 0;
  const progressObjectif = (tauxMarge / objectifMarge) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">📊 RATIO FINANCIER</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Taux d&apos;encaissement :</span>{" "}
          <span className="font-medium">{tauxEncaissement.toFixed(1)}%</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Taux de décaissement :</span>{" "}
          <span className="font-medium">{tauxDecaissement.toFixed(1)}%</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Marge brute :</span>{" "}
          <span className="font-medium text-green-600">
            <MontantDisplay montant={margeBrute} deviseCode={deviseCode} />
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Taux de marge :</span>{" "}
          <span className="font-medium">{tauxMarge.toFixed(1)}%</span>
        </div>
        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-xs">
            <span>🎯 Objectif marge : {objectifMarge}%</span>
            <span>{Math.min(100, progressObjectif).toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progressObjectif >= 100 ? "bg-green-500" : "bg-primary/80"
              }`}
              style={{ width: `${Math.min(100, progressObjectif)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MontantDisplay } from "@/components/devises/MontantDisplay";

interface DeviseExpositionItem {
  code: string;
  value: number;
  percent: number;
}

interface DeviseExpositionChartProps {
  data: DeviseExpositionItem[];
  total: number;
}

export function DeviseExpositionChart({ data, total }: DeviseExpositionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💱 Exposition par devise</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">Aucune donnée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>💱 Exposition par devise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => (
          <div key={item.code} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.code}</span>
              <span className="text-muted-foreground">{item.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-lg font-bold">
            <MontantDisplay montant={total} deviseCode="XOF" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

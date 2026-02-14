"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface MarcheKPICardProps {
  title: string;
  icon: string;
  montant: number;
  montantEur?: number;
  montantXOF?: number;
  deviseCode: string;
  pourcent?: number;
  pourcentMax?: number;
  couleur: "default" | "green" | "red" | "blue";
  sparklineData?: { date: string; value: number }[];
}

const COULEURS = {
  default: { text: "text-foreground", bg: "bg-primary/20", stroke: "#3b82f6" },
  green: { text: "text-green-600", bg: "bg-green-500/20", stroke: "#22c55e" },
  red: { text: "text-red-600", bg: "bg-red-500/20", stroke: "#ef4444" },
  blue: { text: "text-blue-600", bg: "bg-blue-500/20", stroke: "#3b82f6" },
};

export function MarcheKPICard({
  title,
  icon,
  montant,
  montantEur,
  montantXOF,
  deviseCode,
  pourcent,
  pourcentMax = 100,
  couleur,
  sparklineData = [],
}: MarcheKPICardProps) {
  const c = COULEURS[couleur];
  const pct = pourcent != null ? Math.min(100, (pourcent / pourcentMax) * 100) : undefined;

  const chartData = useMemo(() => {
    if (sparklineData.length === 0) return [{ date: "", value: montant }];
    return sparklineData.map((d) => ({ ...d, value: d.value }));
  }, [sparklineData, montant]);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-xl md:text-2xl font-bold ${c.text}`}>
          <MontantDisplay montant={montant} deviseCode={deviseCode} />
        </div>
        {/* Équivalent en XOF pour les marchés non-XOF, en EUR/USD pour les marchés XOF */}
        {montantXOF != null && deviseCode !== "XOF" && (
          <div className="text-xs text-muted-foreground">
            ≈ {montantXOF.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
          </div>
        )}
        {montantEur != null && deviseCode === "XOF" && (
          <div className="text-xs text-muted-foreground">
            ≈ {montantEur.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </div>
        )}
        {pct != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bg}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )}
        {chartData.length > 1 && (
          <div className="h-12 mt-2 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.stroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="rounded border bg-background px-2 py-1 text-xs">
                        {payload[0].value?.toLocaleString("fr-FR")} {deviseCode}
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={c.stroke}
                  fill={`url(#grad-${title})`}
                  strokeWidth={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

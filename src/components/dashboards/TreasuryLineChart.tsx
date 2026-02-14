"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  date: string;
  tresorerie: number;
}

interface TreasuryLineChartProps {
  data: DataPoint[];
  forecast?: DataPoint[];
  seuilCritique?: number;
  conversionRates?: { EUR: number; USD: number };
  periodLabel?: string;
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function formatXOF(v: number) {
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

export function TreasuryLineChart({
  data,
  forecast = [],
  seuilCritique = 0,
  conversionRates = { EUR: 655.957, USD: 600 },
  periodLabel = "30 jours",
}: TreasuryLineChartProps) {
  const [devise, setDevise] = useState<"XOF" | "EUR" | "USD">("XOF");
  const taux = devise === "XOF" ? 1 : conversionRates[devise] ?? 655.957;
  const sym = devise === "XOF" ? " FCFA" : devise === "EUR" ? " €" : " $";

  const dataScaled = data.map((d) => ({
    ...d,
    tresorerie: d.tresorerie / taux,
    prevision: null as number | null,
  }));

  const forecastScaled = forecast.map((d) => ({
    ...d,
    tresorerie: null as number | null,
    prevision: d.tresorerie / taux,
  }));

  const mergedData = [...dataScaled, ...forecastScaled].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.[0]?.value) return null;
    const val = payload[0].value * taux;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
        <p className="font-medium mb-1">{formatShortDate(label ?? "")}</p>
        <p>XOF: {formatXOF(val)}</p>
        <p className="text-muted-foreground">≈ {formatCurrency(val / conversionRates.EUR, "EUR")}</p>
        <p className="text-muted-foreground">≈ {formatCurrency(val / conversionRates.USD, "USD")}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>📈 Évolution trésorerie ({periodLabel})</CardTitle>
        <div className="flex gap-1">
          {(["XOF", "EUR", "USD"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevise(d)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                devise === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} className="text-xs" />
              <YAxis
                tickFormatter={(v) => `${(v / (devise === "XOF" ? 1000 : 1)).toFixed(0)}${devise === "XOF" ? "k" : ""}`}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              {seuilCritique > 0 && (
                <ReferenceLine
                  y={seuilCritique / taux}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="tresorerie"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Trésorerie"
                connectNulls
              />
              {forecast.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="prevision"
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="Prévision"
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

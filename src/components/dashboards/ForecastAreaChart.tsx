"use client";

import {
  AreaChart,
  Area,
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

interface ForecastAreaChartProps {
  data: DataPoint[];
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function ForecastAreaChart({ data }: ForecastAreaChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prévisions trésorerie (30j)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorTresorerie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                className="text-xs"
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Prévision"]}
                labelFormatter={formatShortDate}
              />
              <Area
                type="monotone"
                dataKey="tresorerie"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorTresorerie)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  month: string;
  encaissements: number;
  decaissements: number;
}

interface EncDecBarChartProps {
  data: DataPoint[];
}

function formatMonth(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatXOF(v: number) {
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

export function EncDecBarChart({ data }: EncDecBarChartProps) {
  const dataWithMarge = data.map((d) => ({
    ...d,
    marge: d.encaissements - d.decaissements,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Encaissements vs Décaissements (12 mois)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataWithMarge}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                className="text-xs"
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => [formatXOF(value), ""]}
                labelFormatter={formatMonth}
              />
              <Legend />
              <Bar dataKey="encaissements" fill="#22c55e" name="Encaissements" radius={[4, 4, 0, 0]} />
              <Bar dataKey="decaissements" fill="#ef4444" name="Décaissements" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="marge"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Marge brute"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

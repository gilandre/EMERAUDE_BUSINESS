"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  name: string;
  value: number;
}

interface DecByCategoryPieChartProps {
  data: DataPoint[];
  decByDevise?: DataPoint[];
  decByBeneficiary?: DataPoint[];
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function formatXOF(v: number) {
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

export function DecByCategoryPieChart({
  data,
  decByDevise = [],
  decByBeneficiary = [],
}: DecByCategoryPieChartProps) {
  const [mode, setMode] = useState<"cat" | "devise" | "benef">("cat");

  const dataset =
    mode === "cat"
      ? data
      : mode === "devise"
      ? decByDevise
      : decByBeneficiary;

  const labels = {
    cat: "Catégorie",
    devise: "Devise",
    benef: "Bénéficiaire",
  };

  if (dataset.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🥧 Répartition décaissements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-muted-foreground">Aucun décaissement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>🥧 Répartition décaissements</CardTitle>
        <div className="flex gap-1">
          {(["cat", "benef", "devise"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {labels[m] === "Catégorie" ? "Catégorie" : labels[m] === "Bénéficiaire" ? "Bénéf" : "Devise"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataset}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {dataset.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatXOF(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

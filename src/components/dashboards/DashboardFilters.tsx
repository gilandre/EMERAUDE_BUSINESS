"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Period = "today" | "7d" | "30d" | "month" | "custom";

const LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  month: "Ce mois",
  custom: "Période personnalisée",
};

interface DashboardFiltersProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  className?: string;
}

export function DashboardFilters({
  period,
  onPeriodChange,
  className,
}: DashboardFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {(Object.keys(LABELS) as Period[]).map((p) => (
        <Button
          key={p}
          variant={period === p ? "default" : "outline"}
          size="sm"
          onClick={() => onPeriodChange(p)}
        >
          {LABELS[p]}
        </Button>
      ))}
    </div>
  );
}

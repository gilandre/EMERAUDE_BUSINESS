"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ReportTable, ReportFilter, ReportAggregation } from "@/lib/reports/types";

const TABLES: { value: ReportTable; label: string }[] = [
  { value: "Marche", label: "Marché" },
  { value: "Accompte", label: "Accompte" },
  { value: "Decaissement", label: "Décaissement" },
];

const AGGREGATIONS: { value: ReportAggregation; label: string }[] = [
  { value: "SUM", label: "Somme" },
  { value: "AVG", label: "Moyenne" },
  { value: "COUNT", label: "Nombre" },
  { value: "MIN", label: "Minimum" },
  { value: "MAX", label: "Maximum" },
];

interface QueryBuilderProps {
  selectedTemplate: string | null;
  onConfigChange: (config: object) => void;
  onGenerate: (templateCode: string, format: string, config?: object) => void;
}

export function QueryBuilder({ selectedTemplate, onConfigChange, onGenerate }: QueryBuilderProps) {
  const [tables, setTables] = useState<ReportTable[]>(["Marche"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | "json">("excel");

  const addFilter = () => {
    setFilters([...filters, { field: "montant", operator: "gte", value: 0 }]);
  };

  const updateFilter = (i: number, updates: Partial<ReportFilter>) => {
    const next = [...filters];
    next[i] = { ...next[i]!, ...updates };
    setFilters(next);
  };

  const removeFilter = (i: number) => {
    setFilters(filters.filter((_, j) => j !== i));
  };

  const buildConfig = () => ({
    tables,
    filters,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    onGenerate(selectedTemplate, format, buildConfig());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Builder de requête</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tables</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {TABLES.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={tables.includes(t.value) ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setTables((prev) =>
                    prev.includes(t.value)
                      ? prev.filter((x) => x !== t.value)
                      : [...prev, t.value]
                  )
                }
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Date début</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Filtres</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addFilter}>
              + Ajouter
            </Button>
          </div>
          {filters.length > 0 && (
            <div className="mt-2 space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Champ"
                    value={f.field}
                    onChange={(e) => updateFilter(i, { field: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    className="w-32"
                    value={f.operator}
                    onValueChange={(v) => updateFilter(i, { operator: v as ReportFilter["operator"] })}
                    options={[
                      { value: "eq", label: "=" },
                      { value: "ne", label: "≠" },
                      { value: "gt", label: ">" },
                      { value: "gte", label: "≥" },
                      { value: "lt", label: "<" },
                      { value: "lte", label: "≤" },
                    ]}
                  />
                  <Input
                    placeholder="Valeur"
                    value={String(f.value)}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    className="w-24"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFilter(i)}>
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Format d&apos;export</Label>
          <Select
            className="mt-1 w-full"
            value={format}
            onValueChange={(v) => setFormat(v as typeof format)}
            options={[
              { value: "excel", label: "Excel (.xlsx)" },
              { value: "pdf", label: "PDF" },
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
            ]}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={!selectedTemplate}
        >
          Générer le rapport
        </Button>
      </CardContent>
    </Card>
  );
}

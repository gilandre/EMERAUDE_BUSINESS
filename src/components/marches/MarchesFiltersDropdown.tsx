"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, RotateCcw } from "lucide-react";

export interface MarchesFiltersState {
  statut: string[];
  devise: string[];
  tresorerie: string;
  prefinancement: string;
  dateFrom: string;
  dateTo: string;
}

interface MarchesFiltersDropdownProps {
  filters: MarchesFiltersState;
  onChange: (f: MarchesFiltersState) => void;
  onApply: () => void;
  counts?: Record<string, number>;
}

const STATUT_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "termine", label: "Cloturé" },
  { value: "suspendu", label: "En attente" },
];

const DEVISE_OPTIONS = ["XOF", "EUR", "USD", "XAF", "GBP"];
const TRESORERIE_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "critique", label: "Critique (< 10%)" },
  { value: "faible", label: "Faible (< 30%)" },
  { value: "saine", label: "Saine (> 30%)" },
];
const PREFIN_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "avec", label: "Avec préfinancement" },
  { value: "sans", label: "Sans préfinancement" },
];

export function MarchesFiltersDropdown({
  filters,
  onChange,
  onApply,
  counts = {},
}: MarchesFiltersDropdownProps) {
  const toggleStatut = (v: string) => {
    const next = filters.statut.includes(v)
      ? filters.statut.filter((s) => s !== v)
      : [...filters.statut, v];
    onChange({ ...filters, statut: next });
  };

  const toggleDevise = (v: string) => {
    const next = filters.devise.includes(v)
      ? filters.devise.filter((d) => d !== v)
      : [...filters.devise, v];
    onChange({ ...filters, devise: next });
  };

  const reset = () => {
    onChange({
      statut: [],
      devise: [],
      tresorerie: "",
      prefinancement: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4 right-0 left-auto">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Statut</Label>
            <div className="mt-1 space-y-1">
              {STATUT_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.statut.includes(o.value)}
                    onChange={() => toggleStatut(o.value)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {o.label} ({counts[o.value] ?? 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Devise</Label>
            <div className="mt-1 space-y-1">
              {DEVISE_OPTIONS.map((code) => (
                <label key={code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.devise.includes(code)}
                    onChange={() => toggleDevise(code)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {code} ({counts[code] ?? 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Trésorerie</Label>
            <select
              value={filters.tresorerie}
              onChange={(e) => onChange({ ...filters, tresorerie: e.target.value })}
              className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
            >
              {TRESORERIE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium">Préfinancement</Label>
            <select
              value={filters.prefinancement}
              onChange={(e) => onChange({ ...filters, prefinancement: e.target.value })}
              className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
            >
              {PREFIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.value === "avec" && ` (${counts.avecPrefinancement ?? 0})`}
                  {o.value === "sans" && ` (${counts.sansPrefinancement ?? 0})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium">Date</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="text-sm"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
            <Button size="sm" onClick={onApply}>
              Appliquer
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

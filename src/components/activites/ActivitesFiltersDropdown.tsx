"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, RotateCcw } from "lucide-react";

export interface ActivitesFiltersState {
  type: string[];
  statut: string[];
  deviseCode: string;
  dateFrom: string;
  dateTo: string;
}

interface ActivitesFiltersDropdownProps {
  filters: ActivitesFiltersState;
  onChange: (f: ActivitesFiltersState) => void;
  onApply: () => void;
  activeCount?: number;
}

const TYPE_OPTIONS = [
  { value: "MISSION", label: "Mission" },
  { value: "EVENEMENT", label: "Evénement" },
  { value: "PROJET", label: "Projet" },
  { value: "FORMATION", label: "Formation" },
  { value: "FONCTIONNEMENT", label: "Fonctionnement" },
  { value: "AUTRE", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "CLOTUREE", label: "Clôturée" },
  { value: "ARCHIVEE", label: "Archivée" },
];

export function ActivitesFiltersDropdown({
  filters,
  onChange,
  onApply,
  activeCount = 0,
}: ActivitesFiltersDropdownProps) {
  const [open, setOpen] = useState(false);

  const { data: devisesData } = useQuery({
    queryKey: ["devises-active"],
    queryFn: async () => {
      const res = await fetch("/api/devises");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const deviseOptions: { value: string; label: string }[] = [
    { value: "", label: "Toutes" },
    ...((devisesData ?? []) as { code: string; nom?: string }[]).map((d) => ({
      value: d.code,
      label: d.code,
    })),
  ];

  const toggleType = (v: string) => {
    const next = filters.type.includes(v)
      ? filters.type.filter((t) => t !== v)
      : [...filters.type, v];
    onChange({ ...filters, type: next });
  };

  const toggleStatut = (v: string) => {
    const next = filters.statut.includes(v)
      ? filters.statut.filter((s) => s !== v)
      : [...filters.statut, v];
    onChange({ ...filters, statut: next });
  };

  const reset = () => {
    onChange({ type: [], statut: [], deviseCode: "", dateFrom: "", dateTo: "" });
  };

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
          {activeCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4 right-0 left-auto">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Type</Label>
            <div className="mt-1 space-y-1">
              {TYPE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.type.includes(o.value)}
                    onCheckedChange={() => toggleType(o.value)}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Statut</Label>
            <div className="mt-1 space-y-1">
              {STATUT_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.statut.includes(o.value)}
                    onCheckedChange={() => toggleStatut(o.value)}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Devise</Label>
            <Select
              options={deviseOptions}
              value={filters.deviseCode}
              onValueChange={(v) => onChange({ ...filters, deviseCode: v })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Période</Label>
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
            <Button size="sm" onClick={handleApply}>
              Appliquer
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

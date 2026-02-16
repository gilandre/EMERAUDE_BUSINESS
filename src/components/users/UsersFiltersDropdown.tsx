"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, RotateCcw } from "lucide-react";

export interface UsersFiltersState {
  profilId: string;
  active: string; // "" | "true" | "false"
  mobileAccess: string; // "" | "true" | "false"
}

interface UsersFiltersDropdownProps {
  filters: UsersFiltersState;
  onChange: (f: UsersFiltersState) => void;
  onApply: () => void;
  profils?: { id: string; libelle: string }[];
}

const STATUT_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "true", label: "Actif" },
  { value: "false", label: "Suspendu" },
];

const MOBILE_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "true", label: "Oui" },
  { value: "false", label: "Non" },
];

export function UsersFiltersDropdown({
  filters,
  onChange,
  onApply,
  profils = [],
}: UsersFiltersDropdownProps) {
  const reset = () => {
    onChange({ profilId: "", active: "", mobileAccess: "" });
  };

  const hasFilters = filters.profilId || filters.active || filters.mobileAccess;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={hasFilters ? "border-emerald-500 text-emerald-600" : ""}>
          <Filter className="h-4 w-4 mr-2" />
          Filtres {hasFilters ? "*" : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-4 right-0 left-auto">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Profil</Label>
            <select
              value={filters.profilId}
              onChange={(e) => onChange({ ...filters, profilId: e.target.value })}
              className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
            >
              <option value="">— Tous les profils —</option>
              {profils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium">Statut</Label>
            <select
              value={filters.active}
              onChange={(e) => onChange({ ...filters, active: e.target.value })}
              className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
            >
              {STATUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium">Accès mobile</Label>
            <select
              value={filters.mobileAccess}
              onChange={(e) => onChange({ ...filters, mobileAccess: e.target.value })}
              className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
            >
              {MOBILE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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

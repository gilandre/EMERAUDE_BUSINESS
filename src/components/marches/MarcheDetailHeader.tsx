"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Lock, FileDown, MoreVertical, Trash2 } from "lucide-react";

interface MarcheDetailHeaderProps {
  libelle: string;
  code: string;
  deviseCode: string;
  statut: string;
  onEdit?: () => void;
  onCloturer?: () => void;
  onExporter?: () => void;
  onDelete?: () => void;
}

const DEVISE_LABELS: Record<string, string> = {
  XOF: "XOF (Franc CFA)",
  EUR: "EUR (Euro)",
  USD: "USD (Dollar)",
  GBP: "GBP (Livre)",
};

export function MarcheDetailHeader({
  libelle,
  code,
  deviseCode,
  statut,
  onEdit,
  onCloturer,
  onExporter,
  onDelete,
}: MarcheDetailHeaderProps) {
  return (
    <div className="rounded-lg border bg-card p-4 md:p-6 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/marches">
              <Button variant="ghost" size="sm" className="-ml-2">
                ← Retour
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">Marché: {libelle}</h1>
            <Badge variant={statut === "actif" ? "default" : "secondary"}>
              {statut}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Référence: {code} | Client: {code.replace(/^MAR-/, "")} Corp
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            💱 Devise: {DEVISE_LABELS[deviseCode] ?? deviseCode}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Éditer
            </Button>
          )}
          {onCloturer && (
            <Button variant="outline" size="sm" onClick={onCloturer}>
              <Lock className="h-4 w-4 mr-1" />
              Clôturer
            </Button>
          )}
          {onExporter && (
            <Button variant="outline" size="sm" onClick={onExporter}>
              <FileDown className="h-4 w-4 mr-1" />
              Exporter
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Dupliquer le marché</DropdownMenuItem>
              <DropdownMenuItem>Archiver</DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { MoreHorizontal, Eye, Edit, Archive, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TYPE_COLORS, STATUT_COLORS } from "@/lib/activite-constants";

interface ActiviteRow {
  id: string;
  code: string;
  libelle: string;
  type: string;
  statut: string;
  deviseCode: string;
  totalEntrees: number;
  totalSorties: number;
  solde: number;
  soldeXOF: number;
  budgetPrevisionnel?: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: { mouvements: number };
}

interface ActivitesTableProps {
  items: ActiviteRow[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: (v: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (col: string) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (activite: ActiviteRow) => void;
  onCloturer?: (activite: ActiviteRow) => void;
  onDelete?: (activite: ActiviteRow) => void;
}

function SoldeDot({ solde }: { solde: number }) {
  if (solde > 0) return <span className="text-green-600" title="Positif">+</span>;
  if (solde === 0) return <span className="text-muted-foreground" title="Nul">=</span>;
  return <span className="text-red-600" title="Négatif">-</span>;
}

export function ActivitesTable({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onCloturer,
  onDelete,
}: ActivitesTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const hasActions = canUpdate || canDelete;

  const SortHead = ({ col, label }: { col: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSort(col)}
    >
      {label} {sortBy === col && (sortOrder === "asc" ? "\u2191" : "\u2193")}
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onSelectAll(checked)}
            />
          </TableHead>
          <TableHead className="w-10">#</TableHead>
          <SortHead col="libelle" label="Activité" />
          <SortHead col="type" label="Type" />
          <SortHead col="statut" label="Statut" />
          <SortHead col="totalEntrees" label="Entrées" />
          <SortHead col="totalSorties" label="Sorties" />
          <SortHead col="solde" label="Solde" />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Checkbox
                checked={selectedIds.includes(a.id)}
                onCheckedChange={() => onSelect(a.id)}
              />
            </TableCell>
            <TableCell>
              <SoldeDot solde={a.solde} />
            </TableCell>
            <TableCell>
              <Link href={`/activites/${a.id}`} className="font-medium hover:underline">
                {a.libelle}
              </Link>
              <p className="text-xs text-muted-foreground">{a.code}</p>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={TYPE_COLORS[a.type] ?? ""}>
                {a.type}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUT_COLORS[a.statut] ?? ""}>
                {a.statut}
              </Badge>
            </TableCell>
            <TableCell>
              <MontantDisplay montant={a.totalEntrees} deviseCode={a.deviseCode} />
            </TableCell>
            <TableCell>
              <MontantDisplay montant={a.totalSorties} deviseCode={a.deviseCode} />
            </TableCell>
            <TableCell>
              <div className={a.solde < 0 ? "text-red-600 font-medium" : a.solde > 0 ? "text-green-600 font-medium" : ""}>
                <MontantDisplay montant={a.solde} deviseCode={a.deviseCode} />
              </div>
              {a.deviseCode !== "XOF" && (
                <div className="text-xs text-muted-foreground">
                  ≈ <MontantDisplay montant={a.soldeXOF} deviseCode="XOF" />
                </div>
              )}
            </TableCell>
            <TableCell className="text-right">
              {hasActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href={`/activites/${a.id}`} className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Voir
                      </Link>
                    </DropdownMenuItem>
                    {canUpdate && (
                      <DropdownMenuItem onClick={() => onEdit?.(a)} className="flex items-center gap-2">
                        <Edit className="h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                    )}
                    {canUpdate && a.statut === "ACTIVE" && (
                      <DropdownMenuItem onClick={() => onCloturer?.(a)} className="flex items-center gap-2">
                        <Archive className="h-4 w-4" /> Clôturer
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem onClick={() => onDelete?.(a)} className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href={`/activites/${a.id}`}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

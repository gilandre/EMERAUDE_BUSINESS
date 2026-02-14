"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { MoreHorizontal } from "lucide-react";

interface MarcheRow {
  id: string;
  code: string;
  libelle: string;
  montant: number;
  montantTotalXOF?: number;
  tresorerie?: number;
  ratioTreso?: number;
  deviseCode?: string;
  statut: string;
  dateFin?: string | null;
  updatedAt: string;
  _count?: { accomptes: number; decaissements: number };
}

interface MarchesTableProps {
  items: MarcheRow[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: (v: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (col: string) => void;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function TresorerieDot({ ratio }: { ratio?: number }) {
  if (ratio == null) return <span className="text-muted-foreground">—</span>;
  if (ratio >= 30) return <span className="text-green-600" title="Sain">🟢</span>;
  if (ratio >= 10) return <span className="text-amber-600" title="Attention">🟡</span>;
  return <span className="text-red-600" title="Critique">🔴</span>;
}

export function MarchesTable({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
}: MarchesTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const SortHead = ({ col, label }: { col: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSort(col)}
    >
      {label} {sortBy === col && (sortOrder === "asc" ? "↑" : "↓")}
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded"
            />
          </TableHead>
          <TableHead className="w-10">#</TableHead>
          <SortHead col="libelle" label="Nom" />
          <TableHead>Client</TableHead>
          <SortHead col="montant" label="Budget" />
          <TableHead>Tréso</TableHead>
          <TableHead>Devise</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((m, i) => (
          <TableRow key={m.id}>
            <TableCell>
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => onSelect(m.id)}
                className="rounded"
              />
            </TableCell>
            <TableCell>
              <TresorerieDot ratio={m.ratioTreso} />
            </TableCell>
            <TableCell>
              <Link href={`/marches/${m.id}`} className="font-medium hover:underline">
                {m.libelle}
              </Link>
              <p className="text-xs text-muted-foreground">{m.code}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell>
              <div>
                <MontantDisplay montant={m.montant} deviseCode={m.deviseCode ?? "XOF"} />
                {m.deviseCode !== "XOF" && m.montantTotalXOF != null && (
                  <div className="text-xs text-muted-foreground">
                    ≈ <MontantDisplay montant={m.montantTotalXOF} deviseCode="XOF" />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div>
                <MontantDisplay montant={m.tresorerie ?? 0} deviseCode={m.deviseCode ?? "XOF"} />
                {m.ratioTreso != null && m.ratioTreso < 10 && (
                  <span className="text-red-600 ml-1" title="Critique">⚠️</span>
                )}
              </div>
            </TableCell>
            <TableCell>{m.deviseCode ?? "XOF"}</TableCell>
            <TableCell className="text-right">
              <Link href={`/marches/${m.id}`}>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { Badge } from "@/components/ui/badge";
import { DecaissementForm } from "./DecaissementForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface DecaissementItem {
  id: string;
  marcheId: string;
  montant: number;
  dateDecaissement: string;
  statut?: "PREVU" | "VALIDE" | "PAYE";
  reference: string | null;
  description: string | null;
}

interface DecaissementsListProps {
  marcheId: string;
  deviseCode?: string;
  soldeDisponible?: number;
}

export function DecaissementsList({ marcheId, deviseCode = "XOF", soldeDisponible = 0 }: DecaissementsListProps) {
  const queryClient = useQueryClient();
  const [editingDecaissement, setEditingDecaissement] = useState<DecaissementItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/decaissements/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la suppression");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decaissements", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Décaissement supprimé");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: list, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["decaissements", marcheId],
    queryFn: async () => {
      const res = await fetch(`/api/decaissements?marcheId=${marcheId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement décaissements");
      }
      return res.json() as Promise<DecaissementItem[]>;
    },
    enabled: !!marcheId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Décaissements</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle>Décaissements</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive text-sm py-2">{error?.message ?? "Erreur de chargement"}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  const items = list ?? [];
  const total = items.reduce((s, d) => s + d.montant, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Décaissements</CardTitle>
        <span className="text-sm font-medium text-red-600">
          Total: <MontantDisplay montant={total} deviseCode={deviseCode} />
        </span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">Aucun décaissement</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDate(d.dateDecaissement)}</TableCell>
                  <TableCell>{d.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={d.statut === "PAYE" ? "default" : d.statut === "VALIDE" ? "secondary" : "outline"}>
                      {d.statut ?? "VALIDE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    -<MontantDisplay montant={d.montant} deviseCode={deviseCode} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {d.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingDecaissement(d)}>
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Supprimer ce décaissement ?")) deleteMutation.mutate(d.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!editingDecaissement} onOpenChange={(open) => !open && setEditingDecaissement(null)}>
        <DialogContent className="max-w-lg">
          {editingDecaissement && (
            <DecaissementForm
              marcheId={marcheId}
              deviseCode={deviseCode}
              soldeDisponible={soldeDisponible}
              decaissement={editingDecaissement}
              onSuccess={() => setEditingDecaissement(null)}
              onCancel={() => setEditingDecaissement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

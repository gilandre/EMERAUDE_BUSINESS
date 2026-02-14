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
import { AccompteForm } from "./AccompteForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface AccompteItem {
  id: string;
  marcheId: string;
  montant: number;
  montantXOF?: number;
  dateEncaissement: string;
  reference: string | null;
  description: string | null;
}

interface AccomptesListProps {
  marcheId: string;
  deviseCode?: string;
}

export function AccomptesList({ marcheId, deviseCode = "XOF" }: AccomptesListProps) {
  const queryClient = useQueryClient();
  const [editingAccompte, setEditingAccompte] = useState<AccompteItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accomptes/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la suppression");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accomptes", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Accompte supprimé");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: list, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["accomptes", marcheId],
    queryFn: async () => {
      const res = await fetch(`/api/accomptes?marcheId=${marcheId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement accomptes");
      }
      return res.json() as Promise<AccompteItem[]>;
    },
    enabled: !!marcheId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Accomptes</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle>Accomptes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive text-sm py-2">{error?.message ?? "Erreur de chargement"}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  const items = list ?? [];
  const total = items.reduce((s, a) => s + a.montant, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Accomptes</CardTitle>
        <span className="text-sm font-medium text-green-600">
          Total: <MontantDisplay montant={total} deviseCode={deviseCode} />
        </span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">Aucun accompte</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.dateEncaissement)}</TableCell>
                  <TableCell>{a.reference ?? "—"}</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    <div className="flex flex-col items-end">
                      <span className="font-bold">
                        +<MontantDisplay montant={a.montant} deviseCode={deviseCode} />
                      </span>
                      {deviseCode !== "XOF" && a.montantXOF != null && (
                        <span className="text-xs text-muted-foreground">
                          <MontantDisplay montant={a.montantXOF} deviseCode="XOF" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {a.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingAccompte(a)}>
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Supprimer cet accompte ?")) deleteMutation.mutate(a.id);
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

      <Dialog open={!!editingAccompte} onOpenChange={(open) => !open && setEditingAccompte(null)}>
        <DialogContent className="max-w-lg">
          {editingAccompte && (
            <AccompteForm
              marcheId={marcheId}
              deviseCode={deviseCode}
              accompte={editingAccompte}
              onSuccess={() => setEditingAccompte(null)}
              onCancel={() => setEditingAccompte(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

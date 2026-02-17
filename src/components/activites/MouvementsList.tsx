"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MouvementForm } from "@/components/activites/MouvementForm";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { toast } from "sonner";
import { Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, ChevronDown, ChevronRight } from "lucide-react";

interface MouvementsListProps {
  activiteId: string;
  deviseCode: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface Mouvement {
  id: string;
  sens: "ENTREE" | "SORTIE";
  montant: number;
  montantXOF: number;
  dateMouvement: string;
  categorie: string | null;
  reference: string | null;
  description: string | null;
  motif: string | null;
  beneficiaire: string | null;
  modePaiement: string | null;
  createdAt: string;
}

const PAGE_SIZES = [10, 20, 50];

export function MouvementsList({ activiteId, deviseCode, canEdit = true, canDelete = true }: MouvementsListProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sensFilter, setSensFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Mouvement | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mouvements", activiteId, page, pageSize, sensFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (sensFilter) params.set("sens", sensFilter);
      const res = await fetch(`/api/activites/${activiteId}/mouvements?${params}`);
      if (!res.ok) throw new Error("Erreur chargement mouvements");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mvtId: string) => {
      const res = await fetch(`/api/activites/${activiteId}/mouvements/${mvtId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors de la suppression");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mouvements", activiteId] });
      queryClient.invalidateQueries({ queryKey: ["activite", activiteId] });
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success("Mouvement supprimé");
      setDeleteTargetId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteTargetId(null);
    },
  });

  const items: Mouvement[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce mouvement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le mouvement sera définitivement supprimé et les totaux de l&apos;activité seront recalculés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} disabled={deleteMutation.isPending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Modifier le mouvement</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <MouvementForm
              activiteId={activiteId}
              deviseCode={deviseCode}
              mode="edit"
              mouvementId={editTarget.id}
              initialData={{
                sens: editTarget.sens,
                montant: editTarget.montant,
                dateMouvement: editTarget.dateMouvement,
                categorie: editTarget.categorie,
                reference: editTarget.reference,
                description: editTarget.description,
                motif: editTarget.motif,
                beneficiaire: editTarget.beneficiaire,
                modePaiement: editTarget.modePaiement,
              }}
              onSuccess={() => setEditTarget(null)}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filtrer:</span>
        {["", "ENTREE", "SORTIE"].map((s) => (
          <Button
            key={s}
            variant={sensFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setSensFilter(s); setPage(1); }}
          >
            {s === "" ? "Tous" : s === "ENTREE" ? "Entrées" : "Sorties"}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{total} mouvement(s)</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <div className="py-4">
          <p className="text-destructive text-sm">Erreur de chargement</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Réessayer
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Aucun mouvement enregistré</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Sens</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Bénéficiaire</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m) => {
              const hasDetails = !!(m.description || m.motif || m.modePaiement);
              const isExpanded = expandedId === m.id;
              return (
                <Fragment key={m.id}>
                  <TableRow className={hasDetails ? "cursor-pointer" : ""} onClick={() => hasDetails && setExpandedId(isExpanded ? null : m.id)}>
                    <TableCell>
                      {m.sens === "ENTREE" ? (
                        <span title="Entrée"><ArrowDownCircle className="h-5 w-5 text-green-600" /></span>
                      ) : (
                        <span title="Sortie"><ArrowUpCircle className="h-5 w-5 text-red-600" /></span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(m.dateMouvement).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className={m.sens === "ENTREE" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {m.sens === "ENTREE" ? "+" : "-"}<MontantDisplay montant={m.montant} deviseCode={deviseCode} />
                      </div>
                      {deviseCode !== "XOF" && (
                        <div className="text-xs text-muted-foreground">
                          ≈ <MontantDisplay montant={m.montantXOF} deviseCode="XOF" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.categorie ? (
                        <Badge variant="outline">{m.categorie}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.beneficiaire ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.reference ?? "—"}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      {hasDetails && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : m.id); }}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setEditTarget(m); }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setDeleteTargetId(m.id); }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {hasDetails && isExpanded && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={7} className="py-3 px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          {m.description && (
                            <div>
                              <span className="font-medium text-muted-foreground">Description : </span>
                              {m.description}
                            </div>
                          )}
                          {m.motif && (
                            <div>
                              <span className="font-medium text-muted-foreground">Motif : </span>
                              {m.motif}
                            </div>
                          )}
                          {m.modePaiement && (
                            <div>
                              <span className="font-medium text-muted-foreground">Mode de paiement : </span>
                              {m.modePaiement}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Par page:</span>
            {PAGE_SIZES.map((s) => (
              <Button
                key={s}
                variant={pageSize === s ? "default" : "outline"}
                size="sm"
                onClick={() => { setPageSize(s); setPage(1); }}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Précédent
            </Button>
            <span className="text-sm">
              Page {page} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

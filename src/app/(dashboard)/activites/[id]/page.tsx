"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Archive, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { TYPE_COLORS, STATUT_COLORS } from "@/lib/activite-constants";

const MouvementsList = dynamic(
  () => import("@/components/activites/MouvementsList").then((m) => ({ default: m.MouvementsList })),
  { loading: () => <Skeleton className="h-64 w-full" /> }
);
const MouvementForm = dynamic(
  () => import("@/components/activites/MouvementForm").then((m) => ({ default: m.MouvementForm })),
  { loading: () => <Skeleton className="h-32 w-full" /> }
);
const ActiviteForm = dynamic(
  () => import("@/components/activites/ActiviteForm").then((m) => ({ default: m.ActiviteForm })),
  { loading: () => <Skeleton className="h-64 w-full" /> }
);

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

export default function ActiviteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const tabParam = searchParams.get("tab") ?? "mouvements";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "cloturer" | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab") ?? "mouvements";
    if (["mouvements", "statistiques", "infos"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", tab);
    router.replace(`/activites/${id}?${p.toString()}`, { scroll: false });
  };

  const { data: activite, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activite", id],
    queryFn: async () => {
      const res = await fetch(`/api/activites/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Activité introuvable");
      }
      return res.json();
    },
    enabled: !!id,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/activites/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la suppression");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success("Activité supprimée");
      router.push("/activites");
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmAction(null);
    },
  });

  const cloturerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/activites/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "CLOTUREE" }),
      });
      if (!res.ok) throw new Error("Erreur lors de la clôture");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activite", id] });
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success("Activité clôturée");
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Erreur lors de la clôture");
      setConfirmAction(null);
    },
  });

  const budgetUsage = useMemo(() => {
    if (!activite?.budgetPrevisionnel || activite.budgetPrevisionnel <= 0) return null;
    const pctEntrees = (activite.totalEntrees / activite.budgetPrevisionnel) * 100;
    const pctSorties = (activite.totalSorties / activite.budgetPrevisionnel) * 100;
    return { pctEntrees, pctSorties };
  }, [activite]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  if (isError || !activite) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error?.message ?? "Activité introuvable."}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
          <Link href="/activites"><Button variant="outline">Retour à la liste</Button></Link>
        </div>
      </div>
    );
  }

  const deviseCode = activite.deviseCode ?? "XOF";
  const deviseSym = deviseCode === "XOF" ? "FCFA" : deviseCode;
  const isPending = deleteMutation.isPending || cloturerMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Confirmation AlertDialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Supprimer cette activité ?" : "Clôturer cette activité ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "Cette action est irréversible. L'activité et tous les mouvements associés seront définitivement supprimés."
                : "Une fois clôturée, aucun mouvement ne pourra plus être ajouté à cette activité."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={isPending}>
              Annuler
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={() => {
                if (confirmAction === "delete") deleteMutation.mutate();
                else if (confirmAction === "cloturer") cloturerMutation.mutate();
              }}
              disabled={isPending}
            >
              {isPending
                ? "En cours..."
                : confirmAction === "delete"
                  ? "Supprimer"
                  : "Clôturer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/activites" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour aux activités
          </Link>
          <h1 className="text-3xl font-bold">{activite.libelle}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{activite.code}</Badge>
            <Badge variant="outline" className={TYPE_COLORS[activite.type] ?? ""}>
              {activite.type}
            </Badge>
            <Badge variant="outline" className={STATUT_COLORS[activite.statut] ?? ""}>
              {activite.statut}
            </Badge>
            <Badge variant="outline">{deviseSym}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-1" /> Modifier
          </Button>
          {activite.statut === "ACTIVE" && (
            <Button variant="outline" size="sm" onClick={() => setConfirmAction("cloturer")}>
              <Archive className="h-4 w-4 mr-1" /> Clôturer
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setConfirmAction("delete")} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;activité</DialogTitle>
          </DialogHeader>
          <ActiviteForm
            mode="edit"
            activiteId={id}
            initialData={{
              libelle: activite.libelle,
              description: activite.description,
              type: activite.type,
              statut: activite.statut,
              deviseCode: activite.deviseCode,
              budgetPrevisionnel: activite.budgetPrevisionnel,
              dateDebut: activite.dateDebut ? String(activite.dateDebut).slice(0, 10) : null,
              dateFin: activite.dateFin ? String(activite.dateFin).slice(0, 10) : null,
              responsableId: activite.responsableId,
            }}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total entrées</p>
                <p className="text-xl font-bold text-green-600">
                  <MontantDisplay montant={activite.totalEntrees} deviseCode={deviseCode} />
                </p>
                {deviseCode !== "XOF" && (
                  <p className="text-xs text-muted-foreground">
                    ≈ <MontantDisplay montant={activite.totalEntreesXOF} deviseCode="XOF" />
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total sorties</p>
                <p className="text-xl font-bold text-red-600">
                  <MontantDisplay montant={activite.totalSorties} deviseCode={deviseCode} />
                </p>
                {deviseCode !== "XOF" && (
                  <p className="text-xs text-muted-foreground">
                    ≈ <MontantDisplay montant={activite.totalSortiesXOF} deviseCode="XOF" />
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${activite.solde >= 0 ? "bg-blue-100 dark:bg-blue-900" : "bg-red-100 dark:bg-red-900"}`}>
                <Wallet className={`h-5 w-5 ${activite.solde >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde</p>
                <p className={`text-xl font-bold ${activite.solde >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  <MontantDisplay montant={activite.solde} deviseCode={deviseCode} />
                </p>
                {deviseCode !== "XOF" && (
                  <p className="text-xs text-muted-foreground">
                    ≈ <MontantDisplay montant={activite.soldeXOF} deviseCode="XOF" />
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="mouvements">
            Mouvements ({activite._count?.mouvements ?? 0})
          </TabsTrigger>
          <TabsTrigger value="statistiques">Statistiques</TabsTrigger>
          <TabsTrigger value="infos">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="mouvements" className="mt-4 space-y-4">
          {activite.statut === "ACTIVE" && (
            <MouvementForm activiteId={id} deviseCode={deviseCode} />
          )}
          {activite.statut !== "ACTIVE" && (
            <p className="text-sm text-muted-foreground italic">
              Cette activité est {activite.statut === "CLOTUREE" ? "clôturée" : "archivée"}. Aucun mouvement ne peut être ajouté.
            </p>
          )}
          <MouvementsList activiteId={id} deviseCode={deviseCode} />
        </TabsContent>

        <TabsContent value="statistiques" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Budget vs Reality */}
            {activite.budgetPrevisionnel != null && activite.budgetPrevisionnel > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Budget prévisionnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <span className="font-medium">
                      <MontantDisplay montant={activite.budgetPrevisionnel} deviseCode={deviseCode} />
                    </span>
                  </div>
                  {budgetUsage && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-600">Entrées</span>
                          <span>{budgetUsage.pctEntrees.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, budgetUsage.pctEntrees)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-600">Sorties</span>
                          <span>{budgetUsage.pctSorties.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, budgetUsage.pctSorties)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé financier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre de mouvements</span>
                    <span className="font-medium">{activite._count?.mouvements ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Total entrées</span>
                    <span className="font-medium text-green-600">
                      +<MontantDisplay montant={activite.totalEntrees} deviseCode={deviseCode} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Total sorties</span>
                    <span className="font-medium text-red-600">
                      -<MontantDisplay montant={activite.totalSorties} deviseCode={deviseCode} />
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Solde net</span>
                    <span className={`font-bold ${activite.solde >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      <MontantDisplay montant={activite.solde} deviseCode={deviseCode} />
                    </span>
                  </div>
                  {deviseCode !== "XOF" && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Solde en XOF</span>
                      <span className="text-sm text-muted-foreground">
                        <MontantDisplay montant={activite.soldeXOF} deviseCode="XOF" />
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="infos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de l&apos;activité</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Code</dt>
                  <dd className="font-mono font-medium">{activite.code}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd>
                    <Badge variant="outline" className={TYPE_COLORS[activite.type] ?? ""}>
                      {activite.type}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Statut</dt>
                  <dd>
                    <Badge variant="outline" className={STATUT_COLORS[activite.statut] ?? ""}>
                      {activite.statut}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Devise</dt>
                  <dd>{deviseSym} (taux création: {activite.tauxChangeCreation})</dd>
                </div>
                {activite.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="text-sm">{activite.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Budget prévisionnel</dt>
                  <dd>
                    {activite.budgetPrevisionnel ? (
                      <MontantDisplay montant={activite.budgetPrevisionnel} deviseCode={deviseCode} />
                    ) : (
                      <span className="text-muted-foreground">Non défini</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Responsable</dt>
                  <dd>{activite.responsable?.name ?? activite.responsable?.email ?? "Non assigné"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Date début</dt>
                  <dd>{formatDate(activite.dateDebut)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Date fin</dt>
                  <dd>{formatDate(activite.dateFin)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Créé le</dt>
                  <dd>{formatDate(activite.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Dernière modification</dt>
                  <dd>{formatDate(activite.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

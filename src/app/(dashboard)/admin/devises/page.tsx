"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, RefreshCw, FileDown, History } from "lucide-react";
import { toast } from "sonner";

export default function AdminDevisesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [histoDevise, setHistoDevise] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    nom: "",
    symbole: "",
    tauxVersXOF: "",
    decimales: "2",
  });

  const { data: devises, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-devises"],
    queryFn: async () => {
      const res = await fetch("/api/devises?all=1");
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  const { data: historique } = useQuery({
    queryKey: ["taux-historique", histoDevise],
    queryFn: async () => {
      const res = await fetch(`/api/devises/taux/historique?deviseCode=${histoDevise ?? ""}&limit=30`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!histoDevise,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { code: string; nom: string; symbole: string; tauxVersXOF: number }) => {
      const res = await fetch("/api/devises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur création");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-devises"] });
      setModalOpen(false);
      setForm({ code: "", nom: "", symbole: "", tauxVersXOF: "", decimales: "2" });
      toast.success("Devise créée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; tauxVersXOF?: number; isActive?: boolean }) => {
      const res = await fetch(`/api/devises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-devises"] });
      setModalOpen(false);
      setEditingId(null);
      toast.success("Devise mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTauxMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/devises/taux/update", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour taux");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-devises"] });
      toast.success("Taux mis à jour via API");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (d: { id: string; code: string; nom: string; symbole: string; tauxVersXOF: number }) => {
    setEditingId(d.id);
    setForm({
      code: d.code,
      nom: d.nom,
      symbole: d.symbole,
      tauxVersXOF: String(d.tauxVersXOF),
      decimales: "2",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taux = parseFloat(form.tauxVersXOF) || 1;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        tauxVersXOF: taux,
      });
    } else {
      createMutation.mutate({
        code: form.code,
        nom: form.nom,
        symbole: form.symbole,
        tauxVersXOF: taux,
      });
    }
  };

  const handleExport = () => {
    const rows = devises?.map((d: { code: string; nom: string; symbole: string; tauxVersXOF: number; isActive: boolean }) =>
      `${d.code};${d.nom};${d.symbole};${d.tauxVersXOF};${d.isActive}`
    ) ?? [];
    const csv = "Code;Nom;Symbole;TauxVersXOF;Actif\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taux-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  };

  const eurDevise = devises?.find((d: { code: string }) => d.code === "EUR");
  const xofDevise = devises?.find((d: { code: string }) => d.code === "XOF");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des devises</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => updateTauxMutation.mutate()} disabled={updateTauxMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${updateTauxMutation.isPending ? "animate-spin" : ""}`} />
            Mettre à jour taux (API)
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => { setEditingId(null); setForm({ code: "", nom: "", symbole: "", tauxVersXOF: "", decimales: "2" }); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle devise
          </Button>
        </div>
      </div>

      {eurDevise && xofDevise && (
        <Card>
          <CardHeader>
            <CardTitle>Validation EUR/XOF</CardTitle>
            <p className="text-sm text-muted-foreground">Taux fixe de référence : 1 EUR = 655,957 XOF (BCEAO)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span>1 EUR =</span>
              <span className="text-2xl font-bold">{Number(eurDevise.tauxVersXOF).toLocaleString("fr-FR")} XOF</span>
              <Badge variant={Math.abs(Number(eurDevise.tauxVersXOF) - 655.957) < 1 ? "default" : "secondary"}>
                {Math.abs(Number(eurDevise.tauxVersXOF) - 655.957) < 1 ? "Conforme" : "Écart"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Réessayer</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Symbole</TableHead>
                  <TableHead>Taux vers XOF</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devises?.map((d: { id: string; code: string; nom: string; symbole: string; tauxVersXOF: number; isActive: boolean }) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.code}</TableCell>
                    <TableCell>{d.nom}</TableCell>
                    <TableCell>{d.symbole}</TableCell>
                    <TableCell>{Number(d.tauxVersXOF).toLocaleString("fr-FR")}</TableCell>
                    <TableCell><Badge variant={d.isActive ? "default" : "secondary"}>{d.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setHistoDevise(d.code)} title="Historique taux">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le taux" : "Nouvelle devise"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required disabled={!!editingId} placeholder="XOF, EUR, USD..." />
              </div>
              {!editingId && (
                <>
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} required placeholder="Franc CFA, Euro, Dollar..." />
                  </div>
                  <div>
                    <Label htmlFor="symbole">Symbole *</Label>
                    <Input id="symbole" value={form.symbole} onChange={(e) => setForm((p) => ({ ...p, symbole: e.target.value }))} required placeholder="FCFA, €, $..." />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="tauxVersXOF">Taux vers XOF (1 unité = X XOF)</Label>
                <Input id="tauxVersXOF" type="number" step="0.000001" value={form.tauxVersXOF} onChange={(e) => setForm((p) => ({ ...p, tauxVersXOF: e.target.value }))} required placeholder="655.957" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!histoDevise} onOpenChange={(o) => !o && setHistoDevise(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Historique des taux — {histoDevise}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-auto">
            {historique?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun historique</p>
            ) : (
              historique?.map((t: { id: string; taux: number; dateDebut: string; source?: string }) => (
                <div key={t.id} className="flex justify-between rounded border p-2 text-sm">
                  <span>{Number(t.taux).toLocaleString("fr-FR")} XOF</span>
                  <span className="text-muted-foreground">{formatDate(t.dateDebut)}</span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoDevise(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

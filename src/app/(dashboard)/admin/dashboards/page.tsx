"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
import { ArrowLeft, BarChart3, ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type DashboardItem = {
  id: string;
  code: string;
  libelle: string;
  config: unknown;
  profilId: string | null;
  isDefault: boolean;
  ordre: number;
  createdAt: string;
};

export default function AdminDashboardsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    libelle: "",
    profilId: "" as string,
    isDefault: false,
    ordre: 0,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-dashboards"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboards");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  const { data: profils } = useQuery({
    queryKey: ["profils"],
    queryFn: async () => {
      const res = await fetch("/api/profils");
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/admin/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payload.code,
          libelle: payload.libelle,
          profilId: payload.profilId || null,
          isDefault: payload.isDefault,
          ordre: payload.ordre,
          config: {},
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur création");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboards"] });
      setModalOpen(false);
      resetForm();
      toast.success("Tableau de bord créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<typeof form>) => {
      const res = await fetch(`/api/admin/dashboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libelle: payload.libelle,
          profilId: payload.profilId || null,
          isDefault: payload.isDefault,
          ordre: payload.ordre,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboards"] });
      setModalOpen(false);
      setEditingId(null);
      resetForm();
      toast.success("Tableau de bord mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/dashboards/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur suppression");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboards"] });
      toast.success("Tableau de bord supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({
      code: "",
      libelle: "",
      profilId: "",
      isDefault: false,
      ordre: 0,
    });
  };

  const openEdit = (d: DashboardItem) => {
    setEditingId(d.id);
    setForm({
      code: d.code,
      libelle: d.libelle,
      profilId: d.profilId ?? "",
      isDefault: d.isDefault,
      ordre: d.ordre,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        libelle: form.libelle,
        profilId: form.profilId || undefined,
        isDefault: form.isDefault,
        ordre: form.ordre,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const dashboards = (data?.data ?? []) as DashboardItem[];
  const profilsList = (profils ?? []) as { id: string; code: string; libelle: string }[];
  const getProfilLabel = (profilId: string | null) =>
    profilId ? profilsList.find((p) => p.id === profilId)?.libelle ?? profilId : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/utilisateurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Dashboards</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir le dashboard
            </Button>
          </Link>
          <Button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau tableau
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tableaux de bord personnalisables</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configurez des configurations de dashboards par profil. Le dashboard principal est accessible via le menu.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Réessayer
              </Button>
            </div>
          ) : dashboards.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun tableau de bord configuré</p>
              <Button
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un tableau
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Profil</TableHead>
                  <TableHead>Par défaut</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboards.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.code}</TableCell>
                    <TableCell>{d.libelle}</TableCell>
                    <TableCell>{getProfilLabel(d.profilId)}</TableCell>
                    <TableCell>
                      <Badge variant={d.isDefault ? "default" : "secondary"}>
                        {d.isDefault ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.ordre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Supprimer le tableau "${d.libelle}" ?`)) {
                              deleteMutation.mutate(d.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              <DialogTitle>
                {editingId ? "Modifier le tableau" : "Nouveau tableau de bord"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  required
                  disabled={!!editingId}
                  placeholder="DASHBOARD_PRINCIPAL..."
                />
              </div>
              <div>
                <Label htmlFor="libelle">Libellé *</Label>
                <Input
                  id="libelle"
                  value={form.libelle}
                  onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
                  required
                  placeholder="Dashboard principal..."
                />
              </div>
              <div>
                <Label htmlFor="profilId">Profil associé</Label>
                <select
                  id="profilId"
                  value={form.profilId}
                  onChange={(e) => setForm((p) => ({ ...p, profilId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— Aucun —</option>
                  {profilsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.libelle} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ordre">Ordre</Label>
                <Input
                  id="ordre"
                  type="number"
                  min={0}
                  value={form.ordre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ordre: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="isDefault">Tableau par défaut</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

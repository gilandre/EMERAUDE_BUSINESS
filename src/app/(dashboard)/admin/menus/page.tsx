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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  code: string;
  libelle: string;
  path: string | null;
  icon: string | null;
  ordre: number;
  parentId: string | null;
  permission: string | null;
  active: boolean;
  profilIds: string[];
};

export default function AdminMenusPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profilsModalOpen, setProfilsModalOpen] = useState(false);
  const [profilsMenuId, setProfilsMenuId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    libelle: "",
    path: "",
    icon: "",
    ordre: 0,
    permission: "",
    active: true,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-menus"],
    queryFn: async () => {
      const res = await fetch("/api/admin/menus");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payload.code,
          libelle: payload.libelle,
          path: payload.path || null,
          icon: payload.icon || null,
          ordre: payload.ordre,
          permission: payload.permission || null,
          active: payload.active,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur création");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      setModalOpen(false);
      resetForm();
      toast.success("Menu créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<typeof form>) => {
      const res = await fetch(`/api/admin/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libelle: payload.libelle,
          path: payload.path ?? null,
          icon: payload.icon ?? null,
          ordre: payload.ordre,
          permission: payload.permission ?? null,
          active: payload.active,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      setModalOpen(false);
      setEditingId(null);
      resetForm();
      toast.success("Menu mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur suppression");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      setProfilsModalOpen(false);
      setProfilsMenuId(null);
      toast.success("Menu supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profilsAssignMutation = useMutation({
    mutationFn: async ({
      menuId,
      profilIds,
    }: { menuId: string; profilIds: string[] }) => {
      const res = await fetch(`/api/admin/menus/${menuId}/profils`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilIds }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur assignation");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      toast.success("Profils assignés");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({
      code: "",
      libelle: "",
      path: "",
      icon: "",
      ordre: 0,
      permission: "",
      active: true,
    });
  };

  const openEdit = (m: MenuItem) => {
    setEditingId(m.id);
    setForm({
      code: m.code,
      libelle: m.libelle,
      path: m.path ?? "",
      icon: m.icon ?? "",
      ordre: m.ordre,
      permission: m.permission ?? "",
      active: m.active,
    });
    setModalOpen(true);
  };

  const openProfils = (m: MenuItem) => {
    setProfilsMenuId(m.id);
    setProfilsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        libelle: form.libelle,
        path: form.path || undefined,
        icon: form.icon || undefined,
        ordre: form.ordre,
        permission: form.permission || undefined,
        active: form.active,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const menus = (data?.menus ?? []) as MenuItem[];
  const profils = (data?.profils ?? []) as { id: string; code: string; libelle: string }[];
  const selectedMenu = menus.find((m) => m.id === profilsMenuId);
  const selectedProfilIds = new Set(selectedMenu?.profilIds ?? []);

  const toggleProfil = (profilId: string) => {
    const next = new Set(selectedProfilIds);
    if (next.has(profilId)) next.delete(profilId);
    else next.add(profilId);
    if (profilsMenuId) {
      profilsAssignMutation.mutate({
        menuId: profilsMenuId,
        profilIds: Array.from(next),
      });
    }
  };

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
          <h1 className="text-2xl font-bold">Menus dynamiques</h1>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau menu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des menus</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configurez les menus de navigation et assignez-les aux profils utilisateur.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Réessayer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Chemin</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Profils</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.code}</TableCell>
                    <TableCell>{m.libelle}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.path ?? "—"}
                    </TableCell>
                    <TableCell>{m.ordre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.permission ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "default" : "secondary"}>
                        {m.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.profilIds.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openProfils(m)}
                          title="Assigner aux profils"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Supprimer le menu "${m.libelle}" ?`)) {
                              deleteMutation.mutate(m.id);
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
              <DialogTitle>{editingId ? "Modifier le menu" : "Nouveau menu"}</DialogTitle>
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
                  placeholder="DASHBOARD, MARCHES..."
                />
              </div>
              <div>
                <Label htmlFor="libelle">Libellé *</Label>
                <Input
                  id="libelle"
                  value={form.libelle}
                  onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
                  required
                  placeholder="Dashboard, Marchés..."
                />
              </div>
              <div>
                <Label htmlFor="path">Chemin</Label>
                <Input
                  id="path"
                  value={form.path}
                  onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                  placeholder="/dashboard, /marches..."
                />
              </div>
              <div>
                <Label htmlFor="icon">Icône (Lucide)</Label>
                <Input
                  id="icon"
                  value={form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                  placeholder="LayoutDashboard, Briefcase..."
                />
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
              <div>
                <Label htmlFor="permission">Permission requise</Label>
                <Input
                  id="permission"
                  value={form.permission}
                  onChange={(e) => setForm((p) => ({ ...p, permission: e.target.value }))}
                  placeholder="marches:read, users:read..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, active: !!v }))}
                />
                <Label htmlFor="active">Menu actif</Label>
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

      <Dialog open={profilsModalOpen} onOpenChange={setProfilsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assigner aux profils — {selectedMenu?.libelle}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Cochez les profils qui peuvent voir ce menu dans la navigation.
            </p>
          </DialogHeader>
          <div className="space-y-3 max-h-[300px] overflow-auto">
            {profils.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-2"
              >
                <Checkbox
                  checked={selectedProfilIds.has(p.id)}
                  onCheckedChange={() => toggleProfil(p.id)}
                  disabled={profilsAssignMutation.isPending}
                />
                <span className="font-medium">{p.libelle}</span>
                <span className="text-muted-foreground text-sm">({p.code})</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfilsModalOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

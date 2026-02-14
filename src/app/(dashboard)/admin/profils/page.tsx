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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function AdminProfilsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permProfilId, setPermProfilId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", libelle: "", description: "" });

  const { data: profils, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["profils"],
    queryFn: async () => {
      const res = await fetch("/api/profils");
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      if (!res.ok) return { permissions: [], byModule: {} };
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { code: string; libelle: string; description?: string }) => {
      const res = await fetch("/api/profils", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur création");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profils"] });
      setModalOpen(false);
      setForm({ code: "", libelle: "", description: "" });
      toast.success("Profil créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; code?: string; libelle?: string; description?: string | null; active?: boolean; permissionIds?: string[] }) => {
      const res = await fetch(`/api/profils/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profils"] });
      setModalOpen(false);
      setPermModalOpen(false);
      setEditingId(null);
      setPermProfilId(null);
      toast.success("Profil mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/profils/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur suppression");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profils"] });
      toast.success("Profil supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/profils/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suffix: "_COPY" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur duplication");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profils"] });
      toast.success("Profil dupliqué");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (p: { id: string; code: string; libelle: string; description?: string | null }) => {
    setEditingId(p.id);
    setForm({ code: p.code, libelle: p.libelle, description: p.description ?? "" });
    setModalOpen(true);
  };

  const openPerms = (p: { id: string }) => {
    setPermProfilId(p.id);
    setPermModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        code: form.code,
        libelle: form.libelle,
        description: form.description || null,
      });
    } else {
      createMutation.mutate({
        code: form.code,
        libelle: form.libelle,
        description: form.description || undefined,
      });
    }
  };

  const permProfil = profils?.find((p: { id: string }) => p.id === permProfilId);
  const selectedPermIds = new Set((permProfil?.permissions?.map((pp: { permission: { id: string } }) => pp.permission.id) ?? []) as string[]);
  const byModule = (permissionsData?.byModule ?? {}) as Record<string, { id: string; code: string; libelle: string }[]>;

  const togglePerm = (permId: string) => {
    const next = new Set(selectedPermIds);
    if (next.has(permId)) next.delete(permId);
    else next.add(permId);
    if (permProfilId) {
      updateMutation.mutate({
        id: permProfilId,
        permissionIds: Array.from(next) as string[],
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des profils</h1>
        <Button onClick={() => { setEditingId(null); setForm({ code: "", libelle: "", description: "" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau profil
        </Button>
      </div>

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
                  <TableHead>Libellé</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profils?.map((p: { id: string; code: string; libelle: string; active: boolean; _count?: { users: number }; createdAt: string }) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.code}</TableCell>
                    <TableCell>{p.libelle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p._count?.users ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => openPerms(p)}>
                          Permissions
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(p.id)} title="Dupliquer">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Supprimer ce profil ?")) deleteMutation.mutate(p.id);
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
              <DialogTitle>{editingId ? "Modifier le profil" : "Nouveau profil"}</DialogTitle>
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
                  placeholder="ADMIN, MANAGER..."
                />
              </div>
              <div>
                <Label htmlFor="libelle">Libellé *</Label>
                <Input
                  id="libelle"
                  value={form.libelle}
                  onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Matrice des permissions — {permProfil?.libelle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(byModule).map(([module, perms]) => (
              <div key={module}>
                <h4 className="font-medium text-sm mb-2">{module}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(perms as { id: string; code: string; libelle: string }[]).map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedPermIds.has(perm.id)}
                        onCheckedChange={() => togglePerm(perm.id)}
                        disabled={updateMutation.isPending}
                      />
                      <span className="text-sm">{perm.libelle}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

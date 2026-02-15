"use client";

import { useState, useEffect } from "react";
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
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Key,
  UserCheck,
  UserX,
  LogIn,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminUtilisateursPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    profilId: "",
    mobileAccess: false,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  // Prefetch next page
  useEffect(() => {
    if (data && page < (data.totalPages ?? 1)) {
      const nextParams = new URLSearchParams({ page: String(page + 1), pageSize: "20" });
      if (search) nextParams.set("search", search);
      queryClient.prefetchQuery({
        queryKey: ["admin-users", page + 1, search],
        queryFn: () => fetch(`/api/users?${nextParams}`).then((r) => r.json()),
      });
    }
  }, [data, page, search, queryClient]);

  const { data: profils } = useQuery({
    queryKey: ["profils"],
    queryFn: async () => {
      const res = await fetch("/api/profils");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string; nom?: string; prenom?: string; profilId?: string; mobileAccess?: boolean }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur création");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      setForm({ email: "", password: "", nom: "", prenom: "", profilId: "", mobileAccess: false });
      toast.success("Utilisateur créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMobileAccessMutation = useMutation({
    mutationFn: async ({ id, mobileAccess }: { id: string; mobileAccess: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileAccess }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: (_, { mobileAccess }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(mobileAccess ? "Accès mobile activé" : "Accès mobile désactivé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; email?: string; nom?: string; prenom?: string; profilId?: string | null; active?: boolean; mobileAccess?: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur mise à jour");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      setEditingId(null);
      toast.success("Utilisateur mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur suppression");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur réinitialisation");
      return d;
    },
    onSuccess: () => {
      setResetModal(null);
      setResetPassword("");
      toast.success("Mot de passe réinitialisé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(active ? "Compte activé" : "Compte suspendu");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (u: { id: string; email: string; nom?: string | null; prenom?: string | null; profilId?: string | null; mobileAccess?: boolean }) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: "",
      nom: u.nom ?? "",
      prenom: u.prenom ?? "",
      profilId: u.profilId ?? "",
      mobileAccess: u.mobileAccess ?? false,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        email: form.email,
        nom: form.nom || undefined,
        prenom: form.prenom || undefined,
        profilId: form.profilId || null,
        mobileAccess: form.mobileAccess,
      });
    } else {
      if (!form.password || form.password.length < 8) {
        toast.error("Mot de passe minimum 8 caractères");
        return;
      }
      createMutation.mutate({
        email: form.email,
        password: form.password,
        nom: form.nom || undefined,
        prenom: form.prenom || undefined,
        profilId: form.profilId || undefined,
        mobileAccess: form.mobileAccess,
      });
    }
  };

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button onClick={() => { setEditingId(null); setForm({ email: "", password: "", nom: "", prenom: "", profilId: "", mobileAccess: false }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (email, nom)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Réessayer</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Profil</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: { id: string; email: string; name?: string | null; nom?: string | null; prenom?: string | null; active: boolean; mobileAccess?: boolean; lastLoginAt?: string | null; profilId?: string | null; profil?: { code: string; libelle: string } | null }) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.name || `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.profil?.libelle ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? "default" : "secondary"}>
                          {u.active ? "Actif" : "Suspendu"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleMobileAccessMutation.mutate({ id: u.id, mobileAccess: !u.mobileAccess })}
                          title={u.mobileAccess ? "Désactiver accès mobile" : "Activer accès mobile"}
                          className="inline-flex items-center gap-1"
                        >
                          <Smartphone className={`h-4 w-4 ${u.mobileAccess ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                          <span className={`text-xs ${u.mobileAccess ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                            {u.mobileAccess ? "Oui" : "Non"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setResetModal(u.id)} title="Réinitialiser mot de passe">
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ id: u.id, active: !u.active })}
                            title={u.active ? "Suspendre" : "Activer"}
                          >
                            {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Supprimer cet utilisateur ?")) deleteMutation.mutate(u.id);
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Précédent
                  </Button>
                  <span className="py-2 text-sm text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  disabled={!!editingId}
                />
              </div>
              {!editingId && (
                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    minLength={8}
                    placeholder="Min. 8 caractères"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={form.prenom}
                    onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="profilId">Profil</Label>
                <Select
                  id="profilId"
                  value={form.profilId}
                  onValueChange={(v) => setForm((p) => ({ ...p, profilId: v }))}
                  options={[
                    { value: "", label: "— Aucun —" },
                    ...(profils ?? []).map((p: { id: string; libelle: string }) => ({
                      value: p.id,
                      label: p.libelle,
                    })),
                  ]}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mobileAccess"
                  checked={form.mobileAccess}
                  onChange={(e) => setForm((p) => ({ ...p, mobileAccess: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="mobileAccess" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Accès application mobile
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetModal} onOpenChange={(o) => !o && setResetModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
              <Input
                id="newPassword"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={8}
                placeholder="Min. 8 caractères"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetModal(null)}>Annuler</Button>
            <Button
              onClick={() => resetModal && resetPassword.length >= 8 && resetMutation.mutate({ id: resetModal, password: resetPassword })}
              disabled={!resetPassword || resetPassword.length < 8 || resetMutation.isPending}
            >
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

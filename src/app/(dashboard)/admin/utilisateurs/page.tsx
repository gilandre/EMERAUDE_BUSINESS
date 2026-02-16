"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Key,
  UserCheck,
  UserX,
  Smartphone,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { UsersFiltersDropdown, type UsersFiltersState } from "@/components/users/UsersFiltersDropdown";
import { UsersExportMenu } from "@/components/users/UsersExportMenu";
import { UserEditDialog } from "@/components/users/UserEditDialog";

type SortField = "email" | "nom" | "active" | "lastLoginAt" | "createdAt" | "profil";

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  nom?: string | null;
  prenom?: string | null;
  active: boolean;
  mobileAccess?: boolean;
  lastLoginAt?: string | null;
  profilId?: string | null;
  profil?: { id: string; code: string; libelle: string } | null;
}

export default function AdminUtilisateursPage() {
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<UsersFiltersState>({ profilId: "", active: "", mobileAccess: "" });
  const [filtersApplied, setFiltersApplied] = useState<UsersFiltersState>({ profilId: "", active: "", mobileAccess: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [resetModal, setResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sortBy, sortOrder });
    if (search) params.set("search", search);
    if (filtersApplied.profilId) params.set("profilId", filtersApplied.profilId);
    if (filtersApplied.active) params.set("active", filtersApplied.active);
    if (filtersApplied.mobileAccess) params.set("mobileAccess", filtersApplied.mobileAccess);
    return params;
  }, [page, search, sortBy, sortOrder, filtersApplied]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users", page, search, sortBy, sortOrder, filtersApplied],
    queryFn: async () => {
      const res = await fetch(`/api/users?${buildParams()}`);
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
      const nextParams = new URLSearchParams(buildParams());
      nextParams.set("page", String(page + 1));
      queryClient.prefetchQuery({
        queryKey: ["admin-users", page + 1, search, sortBy, sortOrder, filtersApplied],
        queryFn: () => fetch(`/api/users?${nextParams}`).then((r) => r.json()),
      });
    }
  }, [data, page, search, sortBy, sortOrder, filtersApplied, queryClient, buildParams]);

  const { data: profils } = useQuery({
    queryKey: ["profils"],
    queryFn: async () => {
      const res = await fetch("/api/profils");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
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

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const users: UserRow[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (email, nom)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <UsersFiltersDropdown
              filters={filters}
              onChange={setFilters}
              onApply={() => { setFiltersApplied({ ...filters }); setPage(1); }}
              profils={profils ?? []}
            />
            <UsersExportMenu items={users} containerRef={tableRef} />
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
            <div ref={tableRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button onClick={() => handleSort("email")} className="inline-flex items-center font-medium">
                        Email <SortIcon field="email" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("nom")} className="inline-flex items-center font-medium">
                        Nom <SortIcon field="nom" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("profil")} className="inline-flex items-center font-medium">
                        Profil <SortIcon field="profil" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("active")} className="inline-flex items-center font-medium">
                        Statut <SortIcon field="active" />
                      </button>
                    </TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("lastLoginAt")} className="inline-flex items-center font-medium">
                        Dernière connexion <SortIcon field="lastLoginAt" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
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
                          <Link href={`/admin/utilisateurs/${u.id}`}>
                            <Button variant="ghost" size="sm" title="Voir détail">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setModalOpen(true); }} title="Modifier">
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
            </div>
          )}
        </CardContent>
      </Card>

      <UserEditDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        user={editingUser}
      />

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

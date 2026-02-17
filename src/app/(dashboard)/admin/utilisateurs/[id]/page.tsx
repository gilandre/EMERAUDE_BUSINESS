"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Key,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  Clock,
  Smartphone,
  AlertTriangle,
  Lock,
  Unlock,
  LogOut,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { UserEditDialog } from "@/components/users/UserEditDialog";
import { UserConnexionsTab } from "@/components/users/UserConnexionsTab";
import { UserAuditTab } from "@/components/users/UserAuditTab";

interface Permission {
  id: string;
  code: string;
  libelle: string;
  module: string;
}

interface SessionItem {
  id: string;
  expires: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  email: string;
  name?: string | null;
  nom?: string | null;
  prenom?: string | null;
  active: boolean;
  mobileAccess: boolean;
  lastLoginAt?: string | null;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  profilId?: string | null;
  profil?: { id: string; code: string; libelle: string } | null;
  permissions: Permission[];
  sessions: SessionItem[];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

  const { data: user, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ active }: { active: boolean }) => {
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
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(active ? "Compte activé" : "Compte suspendu");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur suppression");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur supprimé");
      router.push("/admin/utilisateurs");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
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
      setResetOpen(false);
      setResetPassword("");
      toast.success("Mot de passe réinitialisé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ failedLoginAttempts: 0, lockedUntil: null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("Compte débloqué");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const forcePasswordChangeMutation = useMutation({
    mutationFn: async (mustChange: boolean) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mustChangePassword: mustChange }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: (_, mustChange) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success(mustChange ? "Changement de mot de passe forcé" : "Obligation de changement retirée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      const url = sessionId
        ? `/api/users/${id}/sessions?sessionId=${sessionId}`
        : `/api/users/${id}/sessions`;
      const res = await fetch(url, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur révocation");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("Session(s) révoquée(s)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-6">
        <div className="py-8 text-center">
          <p className="text-destructive">Utilisateur introuvable</p>
          <Link href="/admin/utilisateurs">
            <Button variant="outline" size="sm" className="mt-2">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.name || `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() || user.email;

  // Group permissions by module
  const permissionsByModule: Record<string, Permission[]> = {};
  user.permissions.forEach((p) => {
    if (!permissionsByModule[p.module]) permissionsByModule[p.module] = [];
    permissionsByModule[p.module].push(p);
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/utilisateurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <Badge variant={user.active ? "default" : "secondary"}>
                {user.active ? "Actif" : "Suspendu"}
              </Badge>
              {user.profil && (
                <Badge variant="outline">{user.profil.libelle}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Modifier
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            <Key className="h-4 w-4 mr-1" />
            Reset MDP
          </Button>
          {(user.lockedUntil || user.failedLoginAttempts > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unlockMutation.mutate()}
              disabled={unlockMutation.isPending}
            >
              <Unlock className="h-4 w-4 mr-1" />
              Débloquer
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => forcePasswordChangeMutation.mutate(!user.mustChangePassword)}
            disabled={forcePasswordChangeMutation.isPending}
          >
            <Key className="h-4 w-4 mr-1" />
            {user.mustChangePassword ? "Retirer obligation MDP" : "Forcer changement MDP"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleActiveMutation.mutate({ active: !user.active })}
          >
            {user.active ? <UserX className="h-4 w-4 mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
            {user.active ? "Suspendre" : "Activer"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Supprimer cet utilisateur ?")) deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Dernière connexion</p>
                <p className="text-sm font-medium">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Jamais"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${user.failedLoginAttempts > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Tentatives échouées</p>
                <p className="text-sm font-medium">{user.failedLoginAttempts}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Lock className={`h-5 w-5 ${user.lockedUntil ? "text-red-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Verrouillé jusqu&apos;à</p>
                <p className="text-sm font-medium">{user.lockedUntil ? formatDate(user.lockedUntil) : "Non verrouillé"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Smartphone className={`h-5 w-5 ${user.mobileAccess ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Accès mobile</p>
                <p className="text-sm font-medium">{user.mobileAccess ? "Activé" : "Désactivé"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Key className={`h-5 w-5 ${user.mustChangePassword ? "text-orange-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Changement MDP requis</p>
                <p className="text-sm font-medium">{user.mustChangePassword ? "Oui" : "Non"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">
            <Shield className="h-4 w-4 mr-1" />
            Profil & Permissions
          </TabsTrigger>
          <TabsTrigger value="connexions">
            <Clock className="h-4 w-4 mr-1" />
            Historique connexions
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Monitor className="h-4 w-4 mr-1" />
            Journal d&apos;audit
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Monitor className="h-4 w-4 mr-1" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Profil : {user.profil?.libelle ?? "Aucun profil assigné"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.permissions.length === 0 ? (
                <p className="text-muted-foreground">Aucune permission</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module}>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {module}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">
                            {p.libelle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connexions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique des connexions</CardTitle>
            </CardHeader>
            <CardContent>
              <UserConnexionsTab userId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Journal d&apos;audit</CardTitle>
            </CardHeader>
            <CardContent>
              <UserAuditTab userId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sessions actives</CardTitle>
                {user.sessions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Déconnecter toutes les sessions ?")) revokeSessionMutation.mutate(undefined);
                    }}
                    disabled={revokeSessionMutation.isPending}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Tout déconnecter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {user.sessions.length === 0 ? (
                <p className="text-muted-foreground">Aucune session active</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Créée le</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Adresse IP</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.sessions.map((s) => {
                      const isExpired = new Date(s.expires) < new Date();
                      return (
                        <TableRow key={s.id} className={isExpired ? "opacity-50" : ""}>
                          <TableCell className="text-sm">{formatDate(s.createdAt)}</TableCell>
                          <TableCell className="text-sm">
                            <span className={isExpired ? "text-red-500" : ""}>
                              {formatDate(s.expires)}
                            </span>
                            {isExpired && <Badge variant="secondary" className="ml-2 text-xs">Expirée</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.ipAddress ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={s.userAgent ?? ""}>
                            {s.userAgent ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeSessionMutation.mutate(s.id)}
                              disabled={revokeSessionMutation.isPending}
                              title="Révoquer cette session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <UserEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
        }}
      />

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="detailResetPwd">Nouveau mot de passe *</Label>
              <Input
                id="detailResetPwd"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={8}
                placeholder="Min. 8 caractères"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Annuler</Button>
            <Button
              onClick={() => resetPassword.length >= 8 && resetMutation.mutate({ password: resetPassword })}
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

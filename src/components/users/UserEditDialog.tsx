"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: string;
  email: string;
  nom?: string | null;
  prenom?: string | null;
  profilId?: string | null;
  mobileAccess?: boolean;
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserData | null; // null = create mode
  onSuccess?: () => void;
}

export function UserEditDialog({ open, onOpenChange, user, onSuccess }: UserEditDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [form, setForm] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    profilId: "",
    mobileAccess: false,
  });
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    if (open) {
      setChangePassword(false);
      if (user) {
        setForm({
          email: user.email,
          password: "",
          nom: user.nom ?? "",
          prenom: user.prenom ?? "",
          profilId: user.profilId ?? "",
          mobileAccess: user.mobileAccess ?? false,
        });
      } else {
        setForm({ email: "", password: "", nom: "", prenom: "", profilId: "", mobileAccess: false });
      }
    }
  }, [open, user]);

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
      onOpenChange(false);
      toast.success("Utilisateur créé");
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; email?: string; password?: string; nom?: string; prenom?: string; profilId?: string | null; mobileAccess?: boolean }) => {
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
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      onOpenChange(false);
      toast.success("Utilisateur mis à jour");
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && user) {
      if (changePassword && form.password && form.password.length < 8) {
        toast.error("Mot de passe minimum 8 caractères");
        return;
      }
      const payload: { id: string; email?: string; password?: string; nom?: string; prenom?: string; profilId?: string | null; mobileAccess?: boolean } = {
        id: user.id,
        email: form.email,
        nom: form.nom || undefined,
        prenom: form.prenom || undefined,
        profilId: form.profilId || null,
        mobileAccess: form.mobileAccess,
      };
      if (changePassword && form.password) {
        payload.password = form.password;
      }
      updateMutation.mutate(payload);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            {!isEdit ? (
              <div>
                <Label htmlFor="edit-password">Mot de passe *</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={8}
                  placeholder="Min. 8 caractères"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit-changePassword"
                    checked={changePassword}
                    onChange={(e) => {
                      setChangePassword(e.target.checked);
                      if (!e.target.checked) setForm((p) => ({ ...p, password: "" }));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Label htmlFor="edit-changePassword" className="cursor-pointer">
                    Changer le mot de passe
                  </Label>
                </div>
                {changePassword && (
                  <div>
                    <Input
                      id="edit-password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      minLength={8}
                      placeholder="Nouveau mot de passe (min. 8 caractères)"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-prenom">Prénom</Label>
                <Input
                  id="edit-prenom"
                  value={form.prenom}
                  onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={form.nom}
                  onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-profilId">Profil</Label>
              <Select
                id="edit-profilId"
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
                id="edit-mobileAccess"
                checked={form.mobileAccess}
                onChange={(e) => setForm((p) => ({ ...p, mobileAccess: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="edit-mobileAccess" className="flex items-center gap-2 cursor-pointer">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Accès application mobile
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

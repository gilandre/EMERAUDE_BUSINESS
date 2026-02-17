"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createActiviteSchema, updateActiviteSchema, type CreateActiviteInput, type UpdateActiviteInput } from "@/validations/activite.schema";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "MISSION", label: "Mission" },
  { value: "EVENEMENT", label: "Evénement" },
  { value: "PROJET", label: "Projet" },
  { value: "FORMATION", label: "Formation" },
  { value: "FONCTIONNEMENT", label: "Fonctionnement" },
  { value: "AUTRE", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "CLOTUREE", label: "Clôturée" },
  { value: "ARCHIVEE", label: "Archivée" },
];

interface ActiviteFormProps {
  mode: "create" | "edit";
  activiteId?: string;
  initialData?: {
    libelle?: string;
    description?: string;
    type?: string;
    statut?: string;
    deviseCode?: string;
    budgetPrevisionnel?: number | null;
    dateDebut?: string | null;
    dateFin?: string | null;
    responsableId?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ActiviteForm({ mode, activiteId, initialData, onSuccess, onCancel }: ActiviteFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    libelle: "",
    description: "",
    type: "AUTRE",
    statut: "ACTIVE",
    deviseCode: "XOF",
    budgetPrevisionnel: "",
    dateDebut: "",
    dateFin: "",
    responsableId: "",
  });

  const { data: devises = [] } = useQuery({
    queryKey: ["devises"],
    queryFn: async () => {
      const res = await fetch("/api/devises");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users?pageSize=50");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const deviseOptions = devises.map((d: { id: string; code: string; nom: string }) => ({
    value: d.code,
    label: `${d.code} - ${d.nom}`,
  }));

  const userOptions = [
    { value: "", label: "Aucun responsable" },
    ...users.map((u: { id: string; name: string; email: string }) => ({
      value: u.id,
      label: u.name || u.email,
    })),
  ];

  useEffect(() => {
    if (initialData) {
      setForm({
        libelle: initialData.libelle ?? "",
        description: initialData.description ?? "",
        type: initialData.type ?? "AUTRE",
        statut: initialData.statut ?? "ACTIVE",
        deviseCode: initialData.deviseCode ?? "XOF",
        budgetPrevisionnel: initialData.budgetPrevisionnel != null ? String(initialData.budgetPrevisionnel) : "",
        dateDebut: initialData.dateDebut ? String(initialData.dateDebut).slice(0, 10) : "",
        dateFin: initialData.dateFin ? String(initialData.dateFin).slice(0, 10) : "",
        responsableId: initialData.responsableId ?? "",
      });
    }
  }, [initialData]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateActiviteInput) => {
      const res = await fetch("/api/activites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Erreur lors de la création";
        const fieldErrors: Record<string, string> = {};
        if (data.details?.fieldErrors && typeof data.details.fieldErrors === "object") {
          Object.entries(data.details.fieldErrors).forEach(([k, v]) => {
            const arr = Array.isArray(v) ? v : [v];
            if (arr[0]) fieldErrors[k] = String(arr[0]);
          });
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors, submit: msg }));
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success("Activité créée");
      onSuccess?.();
      router.push(`/activites/${data.id}`);
    },
    onError: (err: Error) => {
      setErrors((prev) => (prev.submit ? prev : { ...prev, submit: err.message }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateActiviteInput) => {
      const res = await fetch(`/api/activites/${activiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Erreur lors de la modification";
        const fieldErrors: Record<string, string> = {};
        if (data.details?.fieldErrors && typeof data.details.fieldErrors === "object") {
          Object.entries(data.details.fieldErrors).forEach(([k, v]) => {
            const arr = Array.isArray(v) ? v : [v];
            if (arr[0]) fieldErrors[k] = String(arr[0]);
          });
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors, submit: msg }));
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activite", activiteId] });
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success("Activité modifiée");
      onSuccess?.();
    },
    onError: (err: Error) => {
      setErrors((prev) => (prev.submit ? prev : { ...prev, submit: err.message }));
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      const payload: UpdateActiviteInput = {
        libelle: form.libelle || undefined,
        description: form.description || undefined,
        type: (form.type as UpdateActiviteInput["type"]) || undefined,
        statut: (form.statut as UpdateActiviteInput["statut"]) || undefined,
        budgetPrevisionnel: form.budgetPrevisionnel ? parseFloat(form.budgetPrevisionnel) : undefined,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        responsableId: form.responsableId || undefined,
      };
      const parsed = updateActiviteSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
          if (v?.[0]) fieldErrors[k] = v[0];
        });
        setErrors(fieldErrors);
        return;
      }
      updateMutation.mutate(parsed.data);
    } else {
      const devise = devises.find((d: { code: string }) => d.code === form.deviseCode);
      const payload: CreateActiviteInput = {
        libelle: form.libelle,
        description: form.description || undefined,
        type: (form.type as CreateActiviteInput["type"]) || undefined,
        deviseId: devise?.id,
        deviseCode: form.deviseCode,
        budgetPrevisionnel: form.budgetPrevisionnel ? parseFloat(form.budgetPrevisionnel) : undefined,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        responsableId: form.responsableId || undefined,
      };
      const parsed = createActiviteSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
          if (v?.[0]) fieldErrors[k] = v[0];
        });
        setErrors(fieldErrors);
        return;
      }
      createMutation.mutate(parsed.data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Modifier l'activité" : "Nouvelle activité"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Modifiez les informations de l'activité. Les mouvements existants ne sont pas affectés."
            : "Renseignez les informations de l'activité. Un code sera généré automatiquement."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.submit}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé *</Label>
              <Input
                id="libelle"
                value={form.libelle}
                onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
                placeholder="Ex: Mission Audit Dakar"
                required
              />
              {errors.libelle && <p className="text-sm text-destructive">{errors.libelle}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                options={TYPE_OPTIONS}
                value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description de l'activité..."
              className="min-h-[80px] resize-y"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetPrevisionnel">Budget prévisionnel (optionnel)</Label>
              <Input
                id="budgetPrevisionnel"
                type="number"
                step="0.01"
                min="0"
                value={form.budgetPrevisionnel}
                onChange={(e) => setForm((p) => ({ ...p, budgetPrevisionnel: e.target.value }))}
                placeholder="Laisser vide si non défini"
              />
              {errors.budgetPrevisionnel && <p className="text-sm text-destructive">{errors.budgetPrevisionnel}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviseCode">Devise</Label>
              <Select
                id="deviseCode"
                options={deviseOptions.length ? deviseOptions : [{ value: "XOF", label: "XOF - Franc CFA" }]}
                value={form.deviseCode}
                onValueChange={(v) => setForm((p) => ({ ...p, deviseCode: v }))}
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">La devise ne peut pas être modifiée après création.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={form.dateDebut}
                onChange={(e) => setForm((p) => ({ ...p, dateDebut: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date fin</Label>
              <Input
                id="dateFin"
                type="date"
                value={form.dateFin}
                onChange={(e) => setForm((p) => ({ ...p, dateFin: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsableId">Responsable</Label>
              <Select
                id="responsableId"
                options={userOptions}
                value={form.responsableId}
                onValueChange={(v) => setForm((p) => ({ ...p, responsableId: v }))}
              />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  id="statut"
                  options={STATUT_OPTIONS}
                  value={form.statut}
                  onValueChange={(v) => setForm((p) => ({ ...p, statut: v }))}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'activité"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

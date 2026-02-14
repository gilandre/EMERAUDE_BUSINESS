"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createMarcheSchema, updateMarcheSchema, type CreateMarcheInput, type UpdateMarcheInput } from "@/validations/marche.schema";
import { toast } from "sonner";

interface MarcheFormProps {
  mode: "create" | "edit";
  marcheId?: string;
  initialData?: {
    code?: string;
    libelle?: string;
    montant?: number;
    deviseCode?: string;
    deviseId?: string;
    dateDebut?: string | null;
    dateFin?: string | null;
    statut?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MarcheForm({ mode, marcheId, initialData, onSuccess, onCancel }: MarcheFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    code: "",
    libelle: "",
    montant: "",
    deviseCode: "XOF",
    deviseId: "",
    dateDebut: "",
    dateFin: "",
    statut: "actif",
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

  const deviseOptions = devises.map((d: { id: string; code: string; nom: string }) => ({
    value: d.code,
    label: `${d.code} - ${d.nom}`,
  }));

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code ?? "",
        libelle: initialData.libelle ?? "",
        montant: initialData.montant != null ? String(initialData.montant) : "",
        deviseCode: initialData.deviseCode ?? "XOF",
        deviseId: initialData.deviseId ?? "",
        dateDebut: initialData.dateDebut ? String(initialData.dateDebut).slice(0, 10) : "",
        dateFin: initialData.dateFin ? String(initialData.dateFin).slice(0, 10) : "",
        statut: initialData.statut ?? "actif",
      });
    } else if (!isEdit) {
      setForm({
        code: "",
        libelle: "",
        montant: "",
        deviseCode: "XOF",
        deviseId: "",
        dateDebut: "",
        dateFin: "",
        statut: "actif",
      });
    }
  }, [initialData, isEdit]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateMarcheInput) => {
      const res = await fetch("/api/marches", {
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
      queryClient.invalidateQueries({ queryKey: ["marches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Marché créé");
      onSuccess?.();
      router.push(`/marches/${data.id}`);
    },
    onError: (err: Error) => {
      setErrors((prev) => (prev.submit ? prev : { ...prev, submit: err.message }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateMarcheInput) => {
      const res = await fetch(`/api/marches/${marcheId}`, {
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
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Marché modifié");
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
      const payload: UpdateMarcheInput = {
        libelle: form.libelle || undefined,
        montant: parseFloat(form.montant) || undefined,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        statut: form.statut as "actif" | "termine" | "suspendu",
      };
      const parsed = updateMarcheSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.flatten().fieldErrors &&
          Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
            if (v?.[0]) fieldErrors[k] = v[0];
          });
        setErrors(fieldErrors);
        return;
      }
      updateMutation.mutate(parsed.data);
    } else {
      const devise = devises.find((d: { code: string }) => d.code === form.deviseCode);
      const payload: CreateMarcheInput = {
        code: form.code || undefined,
        libelle: form.libelle,
        montant: parseFloat(form.montant) || 0,
        deviseId: devise?.id,
        deviseCode: form.deviseCode,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        statut: form.statut as "actif" | "termine" | "suspendu",
      };
      const parsed = createMarcheSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.flatten().fieldErrors &&
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
        <CardTitle>{isEdit ? "Modifier le marché" : "Nouveau marché"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Modifiez les informations du marché. Les accomptes et décaissements ne sont pas altérés."
            : "Renseignez les informations du marché. Un code sera généré automatiquement si vide."}
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
                placeholder="Ex: Construction immeuble XYZ"
                required
              />
              {errors.libelle && (
                <p className="text-sm text-destructive">{errors.libelle}</p>
              )}
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="code">Code (optionnel)</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="Auto-généré si vide"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant (budget) *</Label>
              <Input
                id="montant"
                type="number"
                step="0.01"
                min="0"
                value={form.montant}
                onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
                placeholder="0"
                required
              />
              {errors.montant && (
                <p className="text-sm text-destructive">{errors.montant}</p>
              )}
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

          <div className="space-y-2">
            <Label htmlFor="statut">Statut</Label>
            <Select
              id="statut"
              options={[
                { value: "actif", label: "Actif" },
                { value: "termine", label: "Terminé" },
                { value: "suspendu", label: "Suspendu" },
              ]}
              value={form.statut}
              onValueChange={(v) => setForm((p) => ({ ...p, statut: v }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer le marché"}
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

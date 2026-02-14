"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAccompteSchema, updateAccompteSchema, type CreateAccompteInput, type UpdateAccompteInput } from "@/validations/accompte.schema";
import type { AccompteItem } from "./AccomptesList";

interface AccompteFormProps {
  marcheId: string;
  deviseCode?: string;
  accompte?: AccompteItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AccompteForm({ marcheId, deviseCode = "XOF", accompte, onSuccess, onCancel }: AccompteFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!accompte;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    montant: "",
    dateEncaissement: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
  });

  useEffect(() => {
    if (accompte) {
      setForm({
        montant: String(accompte.montant),
        dateEncaissement: accompte.dateEncaissement?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        reference: accompte.reference ?? "",
        description: accompte.description ?? "",
      });
    } else {
      setForm({
        montant: "",
        dateEncaissement: new Date().toISOString().slice(0, 10),
        reference: "",
        description: "",
      });
    }
  }, [accompte]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAccompteInput) => {
      const res = await fetch("/api/accomptes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? (typeof data.details === "string" ? data.details : null) ?? `Erreur ${res.status}`;
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
      queryClient.invalidateQueries({ queryKey: ["accomptes", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm({ montant: "", dateEncaissement: new Date().toISOString().slice(0, 10), reference: "", description: "" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setErrors({ submit: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateAccompteInput) => {
      const res = await fetch(`/api/accomptes/${accompte!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? (typeof data.details === "string" ? data.details : null) ?? `Erreur ${res.status}`;
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
      queryClient.invalidateQueries({ queryKey: ["accomptes", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setErrors({ submit: err.message });
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      const payload: UpdateAccompteInput = {
        montant: parseFloat(form.montant) || undefined,
        dateEncaissement: form.dateEncaissement || undefined,
        reference: form.reference || undefined,
        description: form.description || undefined,
      };
      const parsed = updateAccompteSchema.safeParse(payload);
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
      const payload: CreateAccompteInput = {
        marcheId,
        montant: parseFloat(form.montant) || 0,
        dateEncaissement: form.dateEncaissement,
        reference: form.reference || undefined,
        description: form.description || undefined,
      };
      const parsed = createAccompteSchema.safeParse(payload);
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
        <CardTitle>{isEdit ? "Modifier l'accompte" : "Ajouter un accompte"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.submit}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant ({deviseCode}) *</Label>
              <Input
                id="montant"
                type="number"
                step="0.01"
                min="0.01"
                value={form.montant}
                onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
                required
              />
              {errors.montant && (
                <p className="text-sm text-destructive">{errors.montant}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEncaissement">Date encaissement *</Label>
              <Input
                id="dateEncaissement"
                type="date"
                value={form.dateEncaissement}
                onChange={(e) => setForm((p) => ({ ...p, dateEncaissement: e.target.value }))}
                required
              />
              {errors.dateEncaissement && (
                <p className="text-sm text-destructive">{errors.dateEncaissement}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input
              id="reference"
              value={form.reference}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              placeholder="N° facture / bon"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Commentaire optionnel"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Enregistrer l'accompte"}
            </Button>
            {isEdit && onCancel && (
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

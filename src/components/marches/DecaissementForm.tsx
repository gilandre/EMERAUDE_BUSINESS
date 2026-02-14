"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createDecaissementSchema, updateDecaissementSchema, STATUT_DECAISSEMENT, SOURCES_DECAISSEMENT, MODES_PAIEMENT, type CreateDecaissementInput, type UpdateDecaissementInput } from "@/validations/decaissement.schema";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import type { DecaissementItem } from "./DecaissementsList";

interface DecaissementFormProps {
  marcheId: string;
  soldeDisponible?: number;
  deviseCode?: string;
  decaissement?: DecaissementItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  TRESORERIE: "Trésorerie",
  PREFINANCEMENT: "Préfinancement",
};

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
};

export function DecaissementForm({
  marcheId,
  soldeDisponible = 0,
  deviseCode = "XOF",
  decaissement,
  onSuccess,
  onCancel,
}: DecaissementFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!decaissement;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    montant: "",
    dateDecaissement: new Date().toISOString().slice(0, 10),
    statut: "VALIDE" as "PREVU" | "VALIDE" | "PAYE",
    reference: "",
    description: "",
    motif: "",
    beneficiaire: "",
    modePaiement: "",
    source: "TRESORERIE" as "TRESORERIE" | "PREFINANCEMENT",
  });

  useEffect(() => {
    if (decaissement) {
      setForm({
        montant: String(decaissement.montant),
        dateDecaissement: decaissement.dateDecaissement?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        statut: (decaissement.statut ?? "VALIDE") as "PREVU" | "VALIDE" | "PAYE",
        reference: decaissement.reference ?? "",
        description: decaissement.description ?? "",
        motif: decaissement.motif ?? "",
        beneficiaire: decaissement.beneficiaire ?? "",
        modePaiement: decaissement.modePaiement ?? "",
        source: (decaissement.source ?? "TRESORERIE") as "TRESORERIE" | "PREFINANCEMENT",
      });
    } else {
      setForm({
        montant: "",
        dateDecaissement: new Date().toISOString().slice(0, 10),
        statut: "VALIDE",
        reference: "",
        description: "",
        motif: "",
        beneficiaire: "",
        modePaiement: "",
        source: "TRESORERIE",
      });
    }
  }, [decaissement]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateDecaissementInput) => {
      const res = await fetch("/api/decaissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail ?? data.error ?? "Trésorerie insuffisante ou erreur serveur";
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
      queryClient.invalidateQueries({ queryKey: ["decaissements", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm({
        montant: "",
        dateDecaissement: new Date().toISOString().slice(0, 10),
        statut: "VALIDE",
        reference: "",
        description: "",
        motif: "",
        beneficiaire: "",
        modePaiement: "",
        source: "TRESORERIE",
      });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setErrors({ submit: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateDecaissementInput) => {
      const res = await fetch(`/api/decaissements/${decaissement!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail ?? data.error ?? "Erreur lors de la modification";
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
      queryClient.invalidateQueries({ queryKey: ["decaissements", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setErrors({ submit: err.message });
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;
  const maxMontant = isEdit ? soldeDisponible + (decaissement?.montant ?? 0) : soldeDisponible;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const montant = parseFloat(form.montant) || 0;
    if (montant > maxMontant) {
      setErrors({
        montant: "Trésorerie disponible insuffisante",
        submit: "Le montant ne peut pas dépasser la trésorerie disponible.",
      });
      return;
    }
    if (isEdit) {
      const payload: UpdateDecaissementInput = {
        montant: parseFloat(form.montant) || undefined,
        dateDecaissement: form.dateDecaissement || undefined,
        statut: form.statut,
        reference: form.reference || undefined,
        description: form.description || undefined,
        motif: form.motif || undefined,
        beneficiaire: form.beneficiaire || undefined,
        modePaiement: (form.modePaiement as "especes" | "virement" | "cheque" | "mobile_money") || undefined,
        source: form.source,
      };
      const parsed = updateDecaissementSchema.safeParse(payload);
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
      const payload: CreateDecaissementInput = {
        marcheId,
        montant,
        dateDecaissement: form.dateDecaissement,
        statut: form.statut,
        reference: form.reference || undefined,
        description: form.description || undefined,
        motif: form.motif,
        beneficiaire: form.beneficiaire,
        modePaiement: (form.modePaiement as "especes" | "virement" | "cheque" | "mobile_money") || undefined,
        source: form.source,
      };
      const parsed = createDecaissementSchema.safeParse(payload);
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
        <CardTitle>{isEdit ? "Modifier le décaissement" : "Ajouter un décaissement"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Trésorerie disponible: <strong><MontantDisplay montant={maxMontant} deviseCode={deviseCode} /></strong>
          {isEdit && " (inclut l'annulation du montant actuel)"}. Le décaissement ne peut pas dépasser ce montant.
        </p>
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
                max={maxMontant}
                value={form.montant}
                onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
                required
              />
              {errors.montant && (
                <p className="text-sm text-destructive">{errors.montant}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateDecaissement">Date décaissement *</Label>
              <Input
                id="dateDecaissement"
                type="date"
                value={form.dateDecaissement}
                onChange={(e) => setForm((p) => ({ ...p, dateDecaissement: e.target.value }))}
                required
              />
              {errors.dateDecaissement && (
                <p className="text-sm text-destructive">{errors.dateDecaissement}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beneficiaire">Bénéficiaire *</Label>
              <Input
                id="beneficiaire"
                value={form.beneficiaire}
                onChange={(e) => setForm((p) => ({ ...p, beneficiaire: e.target.value }))}
                placeholder="Nom du bénéficiaire"
                required
              />
              {errors.beneficiaire && (
                <p className="text-sm text-destructive">{errors.beneficiaire}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="motif">Motif *</Label>
              <Input
                id="motif"
                value={form.motif}
                onChange={(e) => setForm((p) => ({ ...p, motif: e.target.value }))}
                placeholder="Raison du décaissement"
                required
              />
              {errors.motif && (
                <p className="text-sm text-destructive">{errors.motif}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source des fonds</Label>
              <Select
                id="source"
                value={form.source}
                onValueChange={(v) => setForm((p) => ({ ...p, source: v as "TRESORERIE" | "PREFINANCEMENT" }))}
                options={SOURCES_DECAISSEMENT.map((s) => ({
                  value: s,
                  label: SOURCE_LABELS[s] ?? s,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modePaiement">Mode de paiement</Label>
              <Select
                id="modePaiement"
                value={form.modePaiement}
                onValueChange={(v) => setForm((p) => ({ ...p, modePaiement: v }))}
                options={[
                  { value: "", label: "— Sélectionner —" },
                  ...MODES_PAIEMENT.map((m) => ({
                    value: m,
                    label: MODE_PAIEMENT_LABELS[m] ?? m,
                  })),
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                id="statut"
                value={form.statut}
                onValueChange={(v) => setForm((p) => ({ ...p, statut: v as "PREVU" | "VALIDE" | "PAYE" }))}
                options={STATUT_DECAISSEMENT.map((s) => ({
                  value: s,
                  label: s === "PREVU" ? "Prévu" : s === "VALIDE" ? "Validé" : "Payé",
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input
              id="reference"
              value={form.reference}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              placeholder="N° pièce"
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
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Enregistrer le décaissement"}
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

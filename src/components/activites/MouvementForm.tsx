"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const SENS_OPTIONS = [
  { value: "ENTREE", label: "Entrée" },
  { value: "SORTIE", label: "Sortie" },
];

const MODE_PAIEMENT_OPTIONS = [
  { value: "", label: "Non spécifié" },
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
];

interface MouvementFormProps {
  activiteId: string;
  deviseCode: string;
  mode?: "create" | "edit";
  mouvementId?: string;
  initialData?: {
    sens: string;
    montant: number;
    dateMouvement: string;
    categorie?: string | null;
    reference?: string | null;
    description?: string | null;
    motif?: string | null;
    beneficiaire?: string | null;
    modePaiement?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EMPTY_FORM = {
  sens: "ENTREE",
  montant: "",
  dateMouvement: new Date().toISOString().slice(0, 10),
  categorie: "",
  reference: "",
  description: "",
  motif: "",
  beneficiaire: "",
  modePaiement: "",
};

export function MouvementForm({
  activiteId,
  deviseCode,
  mode = "create",
  mouvementId,
  initialData,
  onSuccess,
  onCancel,
}: MouvementFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(mode === "edit");
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setForm({
        sens: initialData.sens,
        montant: String(initialData.montant),
        dateMouvement: initialData.dateMouvement
          ? String(initialData.dateMouvement).slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        categorie: initialData.categorie ?? "",
        reference: initialData.reference ?? "",
        description: initialData.description ?? "",
        motif: initialData.motif ?? "",
        beneficiaire: initialData.beneficiaire ?? "",
        modePaiement: initialData.modePaiement ?? "",
      });
    }
  }, [mode, initialData]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sens: form.sens,
        montant: parseFloat(form.montant),
        dateMouvement: form.dateMouvement,
        categorie: form.categorie || undefined,
        reference: form.reference || undefined,
        description: form.description || undefined,
        motif: form.motif || undefined,
        beneficiaire: form.beneficiaire || undefined,
        modePaiement: form.modePaiement || undefined,
      };

      const isEdit = mode === "edit" && mouvementId;
      const url = isEdit
        ? `/api/activites/${activiteId}/mouvements/${mouvementId}`
        : `/api/activites/${activiteId}/mouvements`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? (isEdit ? "Erreur lors de la modification" : "Erreur lors de l'ajout"));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activite", activiteId] });
      queryClient.invalidateQueries({ queryKey: ["mouvements", activiteId] });
      queryClient.invalidateQueries({ queryKey: ["activites"] });
      toast.success(mode === "edit" ? "Mouvement modifié" : "Mouvement ajouté");
      if (mode === "create") {
        setForm(EMPTY_FORM);
        setOpen(false);
      }
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deviseSym = deviseCode === "XOF" ? "FCFA" : deviseCode;
  const isEdit = mode === "edit";

  if (!open && !isEdit) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un mouvement
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isEdit ? "Modifier le mouvement" : "Nouveau mouvement"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sens *</Label>
              <Select
                options={SENS_OPTIONS}
                value={form.sens}
                onValueChange={(v) => setForm((p) => ({ ...p, sens: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Montant ({deviseSym}) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.montant}
                onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.dateMouvement}
                onChange={(e) => setForm((p) => ({ ...p, dateMouvement: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Input
                value={form.categorie}
                onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}
                placeholder="Ex: Transport, Hébergement..."
              />
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                placeholder="N° facture, reçu..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                options={MODE_PAIEMENT_OPTIONS}
                value={form.modePaiement}
                onValueChange={(v) => setForm((p) => ({ ...p, modePaiement: v }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bénéficiaire</Label>
              <Input
                value={form.beneficiaire}
                onChange={(e) => setForm((p) => ({ ...p, beneficiaire: e.target.value }))}
                placeholder="Nom du bénéficiaire"
              />
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input
                value={form.motif}
                onChange={(e) => setForm((p) => ({ ...p, motif: e.target.value }))}
                placeholder="Motif du mouvement"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Détails supplémentaires..."
              className="min-h-[60px] resize-y"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? (isEdit ? "Enregistrement..." : "Ajout...")
                : (isEdit ? "Enregistrer" : "Ajouter")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isEdit) {
                  onCancel?.();
                } else {
                  setOpen(false);
                }
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

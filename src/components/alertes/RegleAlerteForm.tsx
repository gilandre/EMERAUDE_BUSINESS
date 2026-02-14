"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createAlerteSchema, updateAlerteSchema } from "@/validations/alerte.schema";
import { Plus, Trash2 } from "lucide-react";

const CANAL_OPTIONS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
  { value: "webhook", label: "Webhook" },
];

const TYPE_DESTINATAIRE_OPTIONS: { value: string; label: string }[] = [
  { value: "user", label: "Utilisateur" },
  { value: "email", label: "Email libre" },
];

export interface DestinataireItem {
  type: "user" | "email";
  valeur: string;
  canal: string;
}

export interface RegleAlerteFormData {
  code: string;
  libelle: string;
  description: string;
  canaux: string[];
  regle?: object;
  seuils?: object;
  active: boolean;
  alerteDestinataires?: DestinataireItem[];
}

interface RegleAlerteFormProps {
  defaultValues?: Partial<RegleAlerteFormData> & { id?: string };
  mode: "create" | "edit";
}

export function RegleAlerteForm({ defaultValues, mode }: RegleAlerteFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<RegleAlerteFormData>({
    code: defaultValues?.code ?? "",
    libelle: defaultValues?.libelle ?? "",
    description: defaultValues?.description ?? "",
    canaux: defaultValues?.canaux ?? ["email"],
    active: defaultValues?.active ?? true,
    alerteDestinataires: defaultValues?.alerteDestinataires ?? [],
  });

  const [destinataires, setDestinataires] = useState<DestinataireItem[]>(
    defaultValues?.alerteDestinataires ?? []
  );

  useEffect(() => {
    setDestinataires(defaultValues?.alerteDestinataires ?? []);
  }, [defaultValues?.alerteDestinataires]);

  const { data: usersData } = useQuery({
    queryKey: ["users-list-alertes"],
    queryFn: async () => {
      const res = await fetch("/api/users?pageSize=100&page=1");
      if (!res.ok) return { data: [] };
      const json = await res.json();
      return json;
    },
  });

  const users = usersData?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = mode === "edit" && defaultValues?.id
        ? `/api/alertes/regles/${defaultValues.id}`
        : "/api/alertes/regles";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? data.details?.fieldErrors ? "Vérifiez les champs" : `Erreur ${res.status}`;
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
      queryClient.invalidateQueries({ queryKey: ["alertes-regles"] });
      router.push("/admin/alertes");
      router.refresh();
    },
    onError: () => {
      // errors already set in mutationFn
    },
  });

  const addDestinataire = () => {
    setDestinataires((prev) => [...prev, { type: "email", valeur: "", canal: "email" }]);
  };

  const removeDestinataire = (index: number) => {
    setDestinataires((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDestinataire = (index: number, field: keyof DestinataireItem, value: string) => {
    setDestinataires((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "type" && value === "user") next[index].valeur = "";
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validDestinataires = destinataires.filter((d) => d.valeur.trim());
    const payload = mode === "edit"
      ? { libelle: form.libelle, description: form.description || null, canaux: form.canaux, active: form.active, alerteDestinataires: validDestinataires }
      : { code: form.code, libelle: form.libelle, description: form.description || null, canaux: form.canaux, active: form.active, alerteDestinataires: validDestinataires };
    const schema = mode === "edit" ? updateAlerteSchema : createAlerteSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.flatten().fieldErrors &&
        Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
          if (v?.[0]) fieldErrors[k] = v[0];
        });
      setErrors(fieldErrors);
      return;
    }
    mutation.mutate(parsed.data as Record<string, unknown>);
  };

  const toggleCanal = (canal: string) => {
    setForm((prev) => ({
      ...prev,
      canaux: prev.canaux.includes(canal)
        ? prev.canaux.filter((c) => c !== canal)
        : [...prev.canaux, canal],
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Nouvelle règle d'alerte" : "Modifier la règle"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.submit && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.submit}
            </p>
          )}

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="EX: TRESORERIE_SEUIL"
                required
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="libelle">Libellé</Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
              placeholder="Nom de la règle"
              required
            />
            {errors.libelle && <p className="text-sm text-destructive">{errors.libelle}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description optionnelle"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Canaux</Label>
            {errors.canaux && <p className="text-sm text-destructive">{errors.canaux}</p>}
            <div className="flex flex-wrap gap-2">
              {CANAL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={form.canaux.includes(opt.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCanal(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destinataires</Label>
            <p className="text-sm text-muted-foreground">
              Utilisateurs ou emails qui recevront les alertes
            </p>
            <div className="space-y-2">
              {destinataires.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <Select
                    value={d.type}
                    onValueChange={(v) => updateDestinataire(i, "type", v)}
                    options={TYPE_DESTINATAIRE_OPTIONS}
                  />
                  {d.type === "user" ? (
                    <Select
                      value={d.valeur}
                      onValueChange={(v) => updateDestinataire(i, "valeur", v)}
                      options={[
                        { value: "", label: "Sélectionner un utilisateur" },
                        ...users.map((u: { id: string; email: string; nom?: string; prenom?: string }) => ({
                          value: u.email,
                          label: u.email + (u.nom || u.prenom ? ` (${[u.prenom, u.nom].filter(Boolean).join(" ")})` : ""),
                        })),
                        ...(d.valeur && !users.some((u: { email: string }) => u.email === d.valeur)
                          ? [{ value: d.valeur, label: d.valeur }]
                          : []),
                      ]}
                      className="flex-1 min-w-[180px]"
                    />
                  ) : (
                    <Input
                      type="email"
                      placeholder="email@exemple.com"
                      value={d.valeur}
                      onChange={(e) => updateDestinataire(i, "valeur", e.target.value)}
                      className="flex-1 min-w-[180px]"
                    />
                  )}
                  <Select
                    value={d.canal}
                    onValueChange={(v) => updateDestinataire(i, "canal", v)}
                    options={CANAL_OPTIONS}
                    className="w-[100px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDestinataire(i)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addDestinataire}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un destinataire
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active">Règle active</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/alertes")}
            >
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

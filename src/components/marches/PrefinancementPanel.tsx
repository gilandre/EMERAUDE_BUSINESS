"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPrefinancementSchema } from "@/validations/prefinancement.schema";
import { formatCurrency } from "@/lib/utils";

interface PrefinancementPanelProps {
  marcheId: string;
  deviseCode?: string;
}

export function PrefinancementPanel({ marcheId, deviseCode = "XOF" }: PrefinancementPanelProps) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [montant, setMontant] = useState("");
  const [active, setActive] = useState(true);

  const { data: pre, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["prefinancement", marcheId],
    queryFn: async () => {
      const res = await fetch(`/api/prefinancements?marcheId=${marcheId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement préfinancement");
      }
      return res.json();
    },
    enabled: !!marcheId,
    retry: 1,
  });

  useEffect(() => {
    if (pre) {
      setMontant(String(pre.montant ?? pre.montantMax ?? ""));
      setActive(pre.active ?? true);
    } else if (!!marcheId && !isLoading) {
      setMontant("");
      setActive(true);
    }
  }, [pre, marcheId, isLoading]);

  const mutation = useMutation({
    mutationFn: async (payload: { montant: number; montantMax?: number; active: boolean }) => {
      const res = await fetch("/api/prefinancements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marcheId,
          montant: payload.montant,
          montantMax: payload.montant,
          active: payload.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? `Erreur ${res.status}`;
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
      queryClient.invalidateQueries({ queryKey: ["prefinancement", marcheId] });
      queryClient.invalidateQueries({ queryKey: ["marche", marcheId] });
      setErrors({});
    },
    onError: (err: Error) => {
      setErrors((prev) => (prev.submit ? prev : { ...prev, submit: err.message }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const num = parseFloat(montant) || 0;
    const parsed = createPrefinancementSchema.safeParse({
      marcheId,
      montant: num,
      montantMax: num,
      active,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.flatten().fieldErrors &&
        Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
          if (v?.[0]) fieldErrors[k] = v[0];
        });
      setErrors(fieldErrors);
      return;
    }
    mutation.mutate({ montant: num, active });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Préfinancement</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Chargement...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préfinancement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Plafond de préfinancement autorisé pour ce marché. Enregistré en base et contrôlé côté
          serveur (audit trail).
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.submit}
            </p>
          )}

          {pre && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p>Utilisé: {formatCurrency(pre.montantUtilise ?? pre.utilise ?? 0, deviseCode)} / {formatCurrency(pre.montant ?? pre.montantMax ?? 0, deviseCode)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montant">Plafond ({deviseCode === "XOF" ? "FCFA" : deviseCode === "EUR" ? "€" : deviseCode === "USD" ? "$" : deviseCode})</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              min="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0"
            />
            {errors.montant && (
              <p className="text-sm text-destructive">{errors.montant}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active">Préfinancement actif</Label>
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement..." : pre ? "Mettre à jour" : "Créer le préfinancement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

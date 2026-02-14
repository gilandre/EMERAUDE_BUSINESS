"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegleAlerteForm } from "@/components/alertes/RegleAlerteForm";

export default function EditerRegleAlertePage() {
  const params = useParams();
  const id = params.id as string;

  const { data: regle, isLoading } = useQuery({
    queryKey: ["alerte-regle", id],
    queryFn: async () => {
      const res = await fetch(`/api/alertes/regles/${id}`);
      if (!res.ok) throw new Error("Règle introuvable");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!regle) {
    return (
      <div className="p-6">
        <p className="text-destructive">Règle introuvable.</p>
        <Link href="/admin/alertes">
          <Button variant="outline" className="mt-4">
            Retour
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/alertes">
          <Button variant="ghost" size="sm">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Modifier la règle</h1>
      </div>

      <RegleAlerteForm
        mode="edit"
        defaultValues={{
          id: regle.id,
          code: regle.code,
          libelle: regle.libelle,
          description: regle.description ?? "",
          canaux: regle.canaux ?? [],
          active: regle.active ?? true,
          alerteDestinataires: regle.alerteDestinataires?.map((d: { type: string; valeur: string; canal: string }) => ({
            type: d.type,
            valeur: d.valeur,
            canal: d.canal,
          })) ?? [],
        }}
      />
    </div>
  );
}

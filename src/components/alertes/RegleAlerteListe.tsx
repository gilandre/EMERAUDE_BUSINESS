"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Send } from "lucide-react";
import { toast } from "sonner";

export interface RegleAlerte {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  canaux: string[];
  active: boolean;
  createdAt: string;
  _count?: { notifications: number };
  alerteDestinataires?: { canal: string; valeur: string }[];
}

export function RegleAlerteListe() {
  const [testModal, setTestModal] = useState<{ id: string; libelle: string } | null>(null);
  const queryClient = useQueryClient();

  const testMutation = useMutation({
    mutationFn: async (alerteId: string) => {
      const res = await fetch("/api/alertes/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerteId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? d.detail ?? "Erreur test");
      return d;
    },
    onSuccess: () => {
      setTestModal(null);
      queryClient.invalidateQueries({ queryKey: ["alertes-regles"] });
      toast.success("Envoi test effectué");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: regles, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["alertes-regles"],
    queryFn: async () => {
      const res = await fetch("/api/alertes/regles");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur chargement règles");
      }
      return res.json() as Promise<RegleAlerte[]>;
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error?.message ?? "Erreur de chargement"}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  if (!regles?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucune règle d&apos;alerte. Créez-en une pour commencer.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {regles.map((regle) => (
        <Card key={regle.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/alertes/${regle.id}`}
                  className="font-semibold hover:underline"
                >
                  {regle.libelle}
                </Link>
                <Badge variant={regle.active ? "default" : "secondary"}>
                  {regle.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{regle.code}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTestModal({ id: regle.id, libelle: regle.libelle })} title="Tester l'envoi">
                <Send className="h-4 w-4" />
              </Button>
              <Link href={`/admin/alertes/${regle.id}`}>
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {regle.description && (
              <p className="text-sm text-muted-foreground">{regle.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {regle.canaux?.map((c) => (
                <Badge key={c} variant="outline">
                  {c === "email" ? "Email" : c === "sms" ? "SMS" : c === "push" ? "Push" : c === "webhook" ? "Webhook" : c}
                </Badge>
              ))}
            </div>
            {regle.alerteDestinataires && regle.alerteDestinataires.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Destinataires : {regle.alerteDestinataires.map((d) => d.valeur).join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {regle._count?.notifications ?? 0} exécution(s) · Créée le {formatDate(regle.createdAt)}
            </p>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!testModal} onOpenChange={(o) => !o && setTestModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test envoi alerte</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Envoyer un email de test pour la règle &quot;{testModal?.libelle}&quot; aux destinataires configurés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModal(null)}>Annuler</Button>
            <Button
              onClick={() => testModal && testMutation.mutate(testModal.id)}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? "Envoi..." : "Envoyer le test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

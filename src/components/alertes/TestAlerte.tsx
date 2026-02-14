"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface RegleOption {
  id: string;
  code: string;
  libelle: string;
}

export function TestAlerte() {
  const [alerteId, setAlerteId] = useState("");
  const [destinataireCanal, setDestinataireCanal] = useState("email");
  const [destinataireValeur, setDestinataireValeur] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ success?: boolean; error?: string; detail?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: regles } = useQuery({
    queryKey: ["alertes-regles"],
    queryFn: async () => {
      const res = await fetch("/api/alertes/regles");
      if (!res.ok) throw new Error("Erreur chargement règles");
      return res.json() as Promise<RegleOption[]>;
    },
  });

  const regleOptions: SelectOption[] = [
    { value: "", label: "Sélectionner une règle" },
    ...(regles ?? []).map((r) => ({ value: r.id, label: `${r.code} - ${r.libelle}` })),
  ];

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alerteId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/alertes/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerteId,
          destinataires:
            destinataireValeur.trim() ?
              [{ canal: destinataireCanal, valeur: destinataireValeur.trim() }]
              : undefined,
          variables: message.trim() ? { message: message.trim() } : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Erreur", detail: data.detail });
        return;
      }
      setResult({ success: true });
    } catch (err) {
      setResult({
        success: false,
        error: "Erreur",
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Tester une règle</CardTitle>
        <CardDescription>
          Déclenchez un envoi test pour une règle. Sans destinataire, les destinataires par défaut
          de la règle seront utilisés.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alerte">Règle</Label>
            <Select
              id="alerte"
              options={regleOptions}
              value={alerteId}
              onValueChange={setAlerteId}
              placeholder="Sélectionner une règle"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal test</Label>
              <Select
                options={[
                  { value: "email", label: "Email" },
                  { value: "sms", label: "SMS" },
                  { value: "webhook", label: "Webhook" },
                ]}
                value={destinataireCanal}
                onValueChange={setDestinataireCanal}
              />
            </div>
            <div className="space-y-2">
              <Label>Destinataire (optionnel)</Label>
              <Input
                value={destinataireValeur}
                onChange={(e) => setDestinataireValeur(e.target.value)}
                placeholder="email, téléphone ou URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contenu du message test"
              rows={3}
            />
          </div>

          {result && (
            <div
              className={`rounded-md p-3 text-sm ${
                result.success
                  ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.success ? (
                <p>Envoi test effectué avec succès.</p>
              ) : (
                <p>
                  {result.error}
                  {result.detail && ` — ${result.detail}`}
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={!alerteId || loading}>
            {loading ? "Envoi..." : "Envoyer le test"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface ScheduleFormProps {
  templates: { code: string; libelle: string }[];
  onSchedule: (params: {
    rapportCode: string;
    libelle: string;
    frequence: "daily" | "weekly" | "monthly";
    recipients: string[];
  }) => Promise<void>;
}

export function ScheduleForm({ templates, onSchedule }: ScheduleFormProps) {
  const [rapportCode, setRapportCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [frequence, setFrequence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recipients, setRecipients] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapportCode || !recipients.trim()) return;
    setLoading(true);
    try {
      const emails = recipients.split(/[,;\s]+/).filter(Boolean).map((s) => s.trim());
      await onSchedule({
        rapportCode,
        libelle: libelle || (templates.find((t) => t.code === rapportCode)?.libelle ?? rapportCode),
        frequence,
        recipients: emails,
      });
      setRecipients("");
      setLibelle("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="h-5 w-5" />
        <CardTitle>Planifier un rapport</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Rapport</Label>
            <Select
              className="mt-1"
              value={rapportCode}
              onValueChange={setRapportCode}
              placeholder="Choisir un rapport"
              options={templates.map((t) => ({ value: t.code, label: t.libelle }))}
            />
          </div>
          <div>
            <Label>Libellé (optionnel)</Label>
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex: Rapport hebdo finances"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Fréquence</Label>
            <Select
              className="mt-1"
              value={frequence}
              onValueChange={(v) => setFrequence(v as typeof frequence)}
              options={[
                { value: "daily", label: "Quotidien" },
                { value: "weekly", label: "Hebdomadaire" },
                { value: "monthly", label: "Mensuel" },
              ]}
            />
          </div>
          <div>
            <Label>Destinataires (emails, séparés par des virgules)</Label>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email1@exemple.com, email2@exemple.com"
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Planification..." : "Planifier"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

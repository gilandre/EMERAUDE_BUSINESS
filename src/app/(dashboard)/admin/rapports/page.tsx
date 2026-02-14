"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReportTemplateCard } from "@/components/rapports/ReportTemplateCard";
import { QueryBuilder } from "@/components/rapports/QueryBuilder";
import { ScheduleForm } from "@/components/rapports/ScheduleForm";
import { ExecutionsList } from "@/components/rapports/ExecutionsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REPORT_TEMPLATES = [
  { code: "RAPPORT_FINANCIER_MENSUEL", libelle: "Rapport Financier Mensuel", type: "financier" },
  { code: "RAPPORT_TRESORERIE_PAR_MARCHE", libelle: "Rapport Trésorerie par Marché", type: "trésorerie" },
  { code: "RAPPORT_ACCOMPTES_DECAIEMENTS", libelle: "Rapport Accomptes/Décaissements", type: "flux" },
  { code: "RAPPORT_PREFINANCEMENTS", libelle: "Rapport Préfinancements", type: "préfinancement" },
  { code: "RAPPORT_ALERTES_DECLENCHEES", libelle: "Rapport Alertes Déclenchées", type: "alertes" },
  { code: "RAPPORT_AUDIT_UTILISATEURS", libelle: "Rapport Audit Utilisateurs", type: "audit" },
];

export default function AdminRapportsPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { data: executionsData } = useQuery({
    queryKey: ["rapports", "executions"],
    queryFn: async () => {
      const res = await fetch("/api/rapports/executions");
      if (!res.ok) throw new Error("Erreur chargement exécutions");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      templateCode,
      format,
      config,
    }: {
      templateCode: string;
      format: string;
      config?: object;
    }) => {
      const res = await fetch("/api/rapports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode, format, config }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur génération");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rapports", "executions"] });
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (params: {
      rapportCode: string;
      libelle: string;
      frequence: "daily" | "weekly" | "monthly";
      recipients: string[];
    }) => {
      const res = await fetch("/api/rapports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur planification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapports", "schedules"] });
    },
  });

  const handleGenerate = (
    templateCode: string,
    format: string,
    config?: object
  ) => {
    generateMutation.mutate({ templateCode, format, config });
  };

  const handleDownload = (id: string) => {
    window.open(`/api/rapports/download/${id}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Générateur de rapports</h1>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedule">Planification</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-medium">Templates prédéfinis</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_TEMPLATES.map((t) => (
                <ReportTemplateCard
                  key={t.code}
                  code={t.code}
                  libelle={t.libelle}
                  type={t.type}
                  onSelect={setSelectedTemplate}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <QueryBuilder
              selectedTemplate={selectedTemplate}
              onConfigChange={() => {}}
              onGenerate={handleGenerate}
            />
            {selectedTemplate && (
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  Rapport sélectionné :{" "}
                  <span className="font-medium text-foreground">
                    {REPORT_TEMPLATES.find((t) => t.code === selectedTemplate)?.libelle}
                  </span>
                </p>
                {generateMutation.isError && (
                  <p className="mt-2 text-sm text-destructive">
                    {generateMutation.error?.message}
                  </p>
                )}
                {generateMutation.isPending && (
                  <p className="mt-2 text-sm text-muted-foreground">Génération en cours...</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleForm
            templates={REPORT_TEMPLATES}
            onSchedule={scheduleMutation.mutateAsync}
          />
          {scheduleMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {scheduleMutation.error?.message}
            </p>
          )}
        </TabsContent>

        <TabsContent value="history">
          <ExecutionsList
            executions={executionsData?.data ?? []}
            onDownload={handleDownload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

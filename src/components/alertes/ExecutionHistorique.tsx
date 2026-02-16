"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, type SelectOption } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface Execution {
  id: string;
  alerteId: string;
  canal: string;
  destinataire: string;
  sujet: string | null;
  envoyee: boolean;
  envoyeeAt: string | null;
  erreur: string | null;
  createdAt: string;
  alerte?: { id: string; code: string; libelle: string };
}

interface PaginatedResult {
  data: Execution[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CANAL_OPTIONS: SelectOption[] = [
  { value: "", label: "Tous canaux" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
  { value: "webhook", label: "Webhook" },
];

const STATUT_OPTIONS: SelectOption[] = [
  { value: "", label: "Tous" },
  { value: "true", label: "Envoyées" },
  { value: "false", label: "Échouées" },
];

export function ExecutionHistorique() {
  const [page, setPage] = useState(1);
  const [canal, setCanal] = useState("");
  const [envoyee, setEnvoyee] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["alertes-executions", page, canal, envoyee],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (canal) params.set("canal", canal);
      if (envoyee) params.set("envoyee", envoyee);
      const res = await fetch(`/api/alertes/executions?${params}`);
      if (!res.ok) throw new Error("Erreur chargement historique");
      return res.json() as Promise<PaginatedResult>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const result = data as PaginatedResult | undefined;
  const executions = result?.data ?? [];
  const totalPages = result?.totalPages ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Historique des exécutions</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select
            options={CANAL_OPTIONS}
            placeholder="Canal"
            value={canal}
            onValueChange={setCanal}
            className="w-32"
          />
          <Select
            options={STATUT_OPTIONS}
            placeholder="Statut"
            value={envoyee}
            onValueChange={setEnvoyee}
            className="w-32"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Alerte</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Destinataire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Erreur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune exécution
                </TableCell>
              </TableRow>
            ) : (
              executions.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(ex.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{ex.alerte?.libelle ?? ex.alerte?.code ?? ex.alerteId}</span>
                  </TableCell>
                  <TableCell>{ex.canal === "email" ? "Email" : ex.canal === "sms" ? "SMS" : ex.canal === "push" ? "Push" : ex.canal === "webhook" ? "Webhook" : ex.canal}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ex.destinataire}</TableCell>
                  <TableCell>
                    <Badge variant={ex.envoyee ? "default" : "destructive"}>
                      {ex.envoyee ? "Envoyée" : "Échec"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                    {ex.erreur ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {result?.page ?? 1} / {totalPages} ({result?.total ?? 0} résultat(s))
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

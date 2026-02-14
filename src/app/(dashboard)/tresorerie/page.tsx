"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { TreasuryLineChart } from "@/components/dashboards/TreasuryLineChart";

type Period = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
};

export default function TresoreriePage() {
  const [period, setPeriod] = useState<Period>("30d");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tresorerie", period],
    queryFn: async () => {
      const res = await fetch(`/api/tresorerie?period=${period}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur chargement trésorerie");
      }
      return res.json();
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-3xl font-bold">💰 Trésorerie</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">💰 Trésorerie</h1>
        <p className="text-destructive">{error?.message ?? "Erreur de chargement"}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const synthese = data?.synthese ?? {};
  const evolution = data?.evolution ?? [];
  const mouvements = data?.mouvements ?? [];
  const byMarche = data?.byMarche ?? [];
  const conversionRates = data?.conversionRates ?? { EUR: 655.957, USD: 600 };
  const solde = synthese.solde ?? 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">💰 Trésorerie</h1>
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
          <Link href="/marches">
            <Button variant="outline" size="sm">
              Voir les marchés
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde global</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${solde >= 0 ? "text-green-600" : "text-red-600"}`}>
              <MontantDisplay montant={solde} deviseCode="XOF" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Encaissements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              +<MontantDisplay montant={synthese.totalEncaissements ?? 0} deviseCode="XOF" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Période: +<MontantDisplay montant={synthese.encaissementsPeriode ?? 0} deviseCode="XOF" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Décaissements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              -<MontantDisplay montant={synthese.totalDecaissements ?? 0} deviseCode="XOF" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Période: -<MontantDisplay montant={synthese.decaissementsPeriode ?? 0} deviseCode="XOF" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mouvements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mouvements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">sur la période</p>
          </CardContent>
        </Card>
      </div>

      <TreasuryLineChart
        data={evolution}
        seuilCritique={Math.max(0, solde * 0.1)}
        conversionRates={conversionRates}
        periodLabel={PERIOD_LABELS[period]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mouvements récents</CardTitle>
            <p className="text-sm text-muted-foreground">
              Encaissements et décaissements sur la période
            </p>
          </CardHeader>
          <CardContent>
            {mouvements.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Aucun mouvement sur la période</p>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Marché</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mouvements.map((m: { id: string; type: string; date: string; marcheId: string; marcheCode: string; marcheLibelle: string; reference: string | null; montant: number; montantXOF: number; deviseCode: string }) => (
                      <TableRow key={`${m.type}-${m.id}`}>
                        <TableCell className="text-sm">{formatDate(m.date)}</TableCell>
                        <TableCell>
                          <span className={m.type === "accompte" ? "text-green-600" : "text-red-600"}>
                            {m.type === "accompte" ? "+ Encaissement" : "− Décaissement"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/marches/${m.marcheId}`} className="hover:underline">
                            {m.marcheLibelle} ({m.marcheCode})
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.reference ?? "—"}</TableCell>
                        <TableCell className={`text-right font-medium ${m.type === "accompte" ? "text-green-600" : "text-red-600"}`}>
                          {m.type === "accompte" ? "+" : "−"}
                          <MontantDisplay montant={m.montantXOF} deviseCode="XOF" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trésorerie par marché</CardTitle>
            <p className="text-sm text-muted-foreground">
              Marchés actifs avec solde et préfinancement
            </p>
          </CardHeader>
          <CardContent>
            {byMarche.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Aucun marché actif</p>
            ) : (
              <div className="max-h-[400px] overflow-auto space-y-3">
                {byMarche.map((m: { id: string; code: string; libelle: string; deviseCode: string; solde: number; soldeAvecPref: number; prefinancementDispo: number }) => (
                  <Link
                    key={m.id}
                    href={`/marches/${m.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{m.libelle}</p>
                      <p className="text-sm text-muted-foreground">{m.code}</p>
                      {m.prefinancementDispo > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Préfinancement: +<MontantDisplay montant={m.prefinancementDispo} deviseCode="XOF" />
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${m.solde >= 0 ? "text-green-600" : "text-red-600"}`}>
                        <MontantDisplay montant={m.soldeAvecPref} deviseCode="XOF" />
                      </p>
                      <p className="text-xs text-muted-foreground">Solde</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

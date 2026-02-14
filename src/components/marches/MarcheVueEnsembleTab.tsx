"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreasuryLineChart } from "@/components/dashboards/TreasuryLineChart";
import { formatDate } from "@/lib/utils";
import { MontantDisplay } from "@/components/devises/MontantDisplay";

interface Accompte {
  id: string;
  montant: number;
  dateEncaissement: string;
  reference: string | null;
  description: string | null;
}

interface Decaissement {
  id: string;
  montant: number;
  dateDecaissement: string;
  reference: string | null;
  description: string | null;
}

interface MarcheVueEnsembleTabProps {
  marche: {
    libelle: string;
    code: string;
    dateDebut: string | null;
    dateFin: string | null;
    deviseCode: string;
    montant: number;
  };
  accomptes: Accompte[];
  decaissements: Decaissement[];
  synthese: {
    totalEncaissements: number;
    totalDecaissements: number;
    solde: number;
  };
}

export function MarcheVueEnsembleTab({
  marche,
  accomptes,
  decaissements,
  synthese,
}: MarcheVueEnsembleTabProps) {
  const evolutionData = useMemo(() => {
    const points: { date: string; encaisse: number; decaisse: number; tresorerie: number }[] = [];
    const byDate = new Map<string, { enc: number; dec: number }>();

    accomptes.forEach((a) => {
      const d = a.dateEncaissement.slice(0, 10);
      const cur = byDate.get(d) ?? { enc: 0, dec: 0 };
      cur.enc += a.montant;
      byDate.set(d, cur);
    });
    decaissements.forEach((d) => {
      const key = d.dateDecaissement.slice(0, 10);
      const cur = byDate.get(key) ?? { enc: 0, dec: 0 };
      cur.dec += d.montant;
      byDate.set(key, cur);
    });

    const dates = Array.from(byDate.keys()).sort();
    let cumulEnc = 0;
    let cumulDec = 0;
    for (const d of dates) {
      const ev = byDate.get(d)!;
      cumulEnc += ev.enc;
      cumulDec += ev.dec;
      points.push({
        date: d,
        encaisse: cumulEnc,
        decaisse: cumulDec,
        tresorerie: cumulEnc - cumulDec,
      });
    }
    if (points.length === 0) {
      points.push({
        date: new Date().toISOString().slice(0, 10),
        encaisse: 0,
        decaisse: 0,
        tresorerie: synthese.solde,
      });
    }
    return points;
  }, [accomptes, decaissements, synthese.solde]);

  const chartData = evolutionData.map((p) => ({
    date: p.date,
    tresorerie: p.tresorerie,
  }));

  const timelineEvents = useMemo(() => {
    const events: { date: string; type: "encaissement" | "decaissement"; libelle: string; montant: number }[] = [];
    accomptes.forEach((a) => {
      events.push({
        date: a.dateEncaissement,
        type: "encaissement",
        libelle: a.reference ?? a.description ?? "Accompte",
        montant: a.montant,
      });
    });
    decaissements.forEach((d) => {
      events.push({
        date: d.dateDecaissement,
        type: "decaissement",
        libelle: d.reference ?? d.description ?? "Décaissement",
        montant: d.montant,
      });
    });
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [accomptes, decaissements]);

  return (
    <div className="space-y-6">
      <TreasuryLineChart
        data={chartData}
        conversionRates={{ EUR: 655.957, USD: 600 }}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline des événements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timelineEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement</p>
              ) : (
                timelineEvents.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        e.type === "encaissement" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.libelle}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(e.date)} •{" "}
                        {e.type === "encaissement" ? "+" : "-"}
                        <MontantDisplay montant={e.montant} deviseCode={marche.deviseCode} />
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations détaillées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence</span>
              <span>{marche.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date début</span>
              <span>{marche.dateDebut ? formatDate(marche.dateDebut) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date fin</span>
              <span>{marche.dateFin ? formatDate(marche.dateFin) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget total</span>
              <span>
                <MontantDisplay montant={marche.montant} deviseCode={marche.deviseCode} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trésorerie actuelle</span>
              <span
                className={
                  synthese.solde >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                }
              >
                <MontantDisplay montant={synthese.solde} deviseCode={marche.deviseCode} />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pièces jointes / Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun document attaché pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

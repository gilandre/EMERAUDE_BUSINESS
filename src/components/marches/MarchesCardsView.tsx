"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { formatDate } from "@/lib/utils";

interface MarcheCard {
  id: string;
  code: string;
  libelle: string;
  montant: number;
  montantTotalXOF?: number;
  montantEncaisse?: number;
  tresorerie?: number;
  ratioTreso?: number;
  ratioEncaisse?: number;
  deviseCode?: string;
  statut: string;
  dateFin?: string | null;
  hasPrefinancement?: boolean;
}

interface MarchesCardsViewProps {
  items: MarcheCard[];
}

function TresorerieDot({ ratio }: { ratio?: number }) {
  if (ratio == null) return null;
  if (ratio >= 30) return <span className="text-green-600">🟢</span>;
  if (ratio >= 10) return <span className="text-amber-600">🟡</span>;
  return <span className="text-red-600">🔴</span>;
}

export function MarchesCardsView({ items }: MarchesCardsViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => (
        <Card key={m.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <TresorerieDot ratio={m.ratioTreso} />
                  <span className="font-semibold uppercase text-sm">{m.code}</span>
                </div>
                <p className="font-medium mt-1">{m.libelle}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Client: —</p>
            <div className="space-y-1 mb-3">
              <div className="text-lg font-bold">
                <MontantDisplay montant={m.montant} deviseCode={m.deviseCode ?? "XOF"} />
              </div>
              {m.deviseCode !== "XOF" && m.montantTotalXOF != null && (
                <div className="text-xs text-muted-foreground">
                  ≈ <MontantDisplay montant={m.montantTotalXOF} deviseCode="XOF" />
                </div>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, m.ratioEncaisse ?? 0)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Encaissé: {Math.round(m.ratioEncaisse ?? 0)}%
            </p>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">🏦 Tréso:</span>
              <span className="font-medium">
                <MontantDisplay montant={m.tresorerie ?? 0} deviseCode={m.deviseCode ?? "XOF"} />
                {m.ratioTreso != null && ` (${m.ratioTreso.toFixed(0)}%)`}
              </span>
            </div>
            {m.dateFin && (
              <p className="text-xs text-muted-foreground mb-2">
                📅 Deadline: {formatDate(m.dateFin)}
              </p>
            )}
            {m.hasPrefinancement && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Préfinancement</p>
            )}
            <div className="flex gap-2 mt-3">
              <Link href={`/marches/${m.id}`}>
                <Button variant="outline" size="sm">Voir</Button>
              </Link>
              <Link href={`/marches/${m.id}`}>
                <Button variant="ghost" size="sm">Éditer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

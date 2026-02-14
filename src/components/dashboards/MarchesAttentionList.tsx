"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { AlertTriangle } from "lucide-react";

interface Marche {
  id: string;
  code: string;
  libelle: string;
  tresorerie: number;
  ratio: number;
  prefinancementPct?: number | null;
}

interface MarchesAttentionListProps {
  marches: Marche[];
}

export function MarchesAttentionList({ marches }: MarchesAttentionListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          ⚠️ Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {marches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun marché en attention
          </p>
        ) : (
          <div className="space-y-2">
            {marches.map((m) => (
              <Link
                key={m.id}
                href={`/marches/${m.id}`}
                className="flex items-center justify-between rounded-md border p-2 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">{m.libelle}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.ratio < 10 && `Tréso: ${m.ratio.toFixed(0)}%`}
                    {m.ratio >= 10 && m.prefinancementPct != null && m.prefinancementPct > 90 && `Préfin: ${m.prefinancementPct.toFixed(0)}%`}
                    {m.ratio >= 10 && (m.prefinancementPct == null || m.prefinancementPct <= 90) && m.code}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">
                    <MontantDisplay montant={m.tresorerie} deviseCode="XOF" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

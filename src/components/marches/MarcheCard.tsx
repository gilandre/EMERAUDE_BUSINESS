"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { ConversionWidget } from "@/components/devises/ConversionWidget";

export interface MarcheCardProps {
  id: string;
  code: string;
  libelle: string;
  montant: number;
  montantTotalXOF?: number;
  deviseCode?: string;
  statut: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  updatedAt: string;
  _count?: { accomptes: number; decaissements: number };
}

export function MarcheCard({
  id,
  code,
  libelle,
  montant,
  montantTotalXOF,
  deviseCode = "XOF",
  statut,
  updatedAt,
  _count,
}: MarcheCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <Link href={`/marches/${id}`} className="font-semibold hover:underline">
            {libelle}
          </Link>
          <p className="text-sm text-muted-foreground">{code}</p>
        </div>
        <Badge variant={statut === "actif" ? "default" : "secondary"}>{statut}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">
          <MontantDisplay montant={montant} deviseCode={deviseCode} />
        </div>
        {deviseCode !== "XOF" && montantTotalXOF != null && (
          <div className="text-sm text-muted-foreground">
            ≈ <MontantDisplay montant={montantTotalXOF} deviseCode="XOF" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {_count?.accomptes ?? 0} accompte(s) · {_count?.decaissements ?? 0} décaissement(s)
        </p>
        <p className="text-xs text-muted-foreground">Mis à jour: {formatDate(updatedAt)}</p>
        <Link href={`/marches/${id}`}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            Voir le détail
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

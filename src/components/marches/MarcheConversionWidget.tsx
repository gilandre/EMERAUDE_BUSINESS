"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { Copy, FileDown } from "lucide-react";
import { toast } from "sonner";

interface Conversion {
  devise: string;
  nom: string;
  symbole: string;
  montant: number;
}

interface MarcheConversionWidgetProps {
  montantBase: number;
  deviseBase: string;
  showBase?: boolean;
}

const SYMBOLES: Record<string, string> = {
  XOF: "FCFA",
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export function MarcheConversionWidget({
  montantBase,
  deviseBase,
  showBase = true,
}: MarcheConversionWidgetProps) {
  const { data: conversions, isLoading } = useQuery<Conversion[]>({
    queryKey: ["conversions", montantBase, deviseBase],
    queryFn: async () => {
      const res = await fetch(
        `/api/devises/convert?montant=${montantBase}&from=${deviseBase}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: montantBase > 0,
  });

  const handleCopy = useCallback(() => {
    const lines: string[] = [];
    if (showBase) {
      lines.push(`${deviseBase}: ${montantBase.toLocaleString("fr-FR")} ${SYMBOLES[deviseBase] ?? deviseBase} (base)`);
    }
    conversions?.forEach((c) => {
      lines.push(`${c.devise}: ≈ ${c.montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${c.symbole}`);
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Copié dans le presse-papier");
  }, [montantBase, deviseBase, conversions, showBase]);

  const handleExport = useCallback(() => {
    const lines: string[] = [
      "Montant total - Conversions",
      "---",
      ...(showBase
        ? [`${deviseBase}: ${montantBase.toLocaleString("fr-FR")} ${SYMBOLES[deviseBase] ?? deviseBase} (base)`]
        : []),
      ...(conversions ?? []).map(
        (c) =>
          `${c.devise}: ≈ ${c.montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${c.symbole}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversion-montant-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  }, [montantBase, deviseBase, conversions, showBase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          💱 CONVERSION MONTANT TOTAL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showBase && (
          <div className="text-sm">
            <span className="font-medium">{deviseBase}</span>:{" "}
            <MontantDisplay montant={montantBase} deviseCode={deviseBase} />
            <span className="text-muted-foreground"> (base)</span>
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {conversions?.map((c) => (
              <div key={c.devise} className="flex justify-between text-sm">
                <span>{c.devise}</span>
                <span className="font-mono">
                  ≈ {c.montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {c.symbole}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
            <Copy className="h-4 w-4 mr-1" />
            Copier
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1">
            <FileDown className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

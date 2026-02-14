"use client";

const SYMBOLES: Record<string, string> = {
  XOF: "FCFA",
  EUR: "€",
  USD: "$",
  GNF: "FG",
};

function formatMontantClient(montant: number, deviseCode: string): string {
  const symbole = SYMBOLES[deviseCode] ?? deviseCode;
  const fmt = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: deviseCode === "XOF" ? 0 : 2,
    useGrouping: true,
  }).format(montant);
  return `${fmt} ${symbole}`;
}

interface MontantDisplayProps {
  montant: number;
  deviseCode: string;
  showCode?: boolean;
  className?: string;
}

export function MontantDisplay({
  montant,
  deviseCode,
  showCode = false,
  className = "",
}: MontantDisplayProps) {
  const montantFormate = formatMontantClient(montant, deviseCode);

  return (
    <span className={className}>
      {montantFormate}
      {showCode && (
        <span className="text-xs text-muted-foreground ml-1">
          ({deviseCode})
        </span>
      )}
    </span>
  );
}

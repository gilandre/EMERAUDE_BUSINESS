"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MontantDisplay } from "./MontantDisplay";
import { ArrowRightLeft } from "lucide-react";

interface ConversionWidgetProps {
  montantXOF: number;
}

interface Conversion {
  devise: string;
  montant: number;
}

export function ConversionWidget({ montantXOF }: ConversionWidgetProps) {
  const { data: conversions } = useQuery<Conversion[]>({
    queryKey: ["conversions", montantXOF],
    queryFn: async () => {
      const res = await fetch(
        `/api/devises/convert?montant=${montantXOF}&from=XOF`
      );
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Équivalences devises
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {conversions?.map((conv) => (
          <div
            key={conv.devise}
            className="flex justify-between items-center"
          >
            <span className="text-sm font-medium">{conv.devise}</span>
            <MontantDisplay
              montant={conv.montant}
              deviseCode={conv.devise}
              className="text-sm font-mono"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, TrendingUp } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  financier: <TrendingUp className="h-5 w-5" />,
  trésorerie: <FileSpreadsheet className="h-5 w-5" />,
  flux: <FileText className="h-5 w-5" />,
  préfinancement: <FileSpreadsheet className="h-5 w-5" />,
  alertes: <FileText className="h-5 w-5" />,
  audit: <FileText className="h-5 w-5" />,
};

interface ReportTemplateCardProps {
  code: string;
  libelle: string;
  type: string;
  onSelect: (code: string) => void;
}

export function ReportTemplateCard({ code, libelle, type, onSelect }: ReportTemplateCardProps) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => onSelect(code)}>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        {ICONS[type] ?? <FileText className="h-5 w-5" />}
        <span className="font-medium">{libelle}</span>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="outline" size="sm" className="w-full">
          Générer
        </Button>
      </CardContent>
    </Card>
  );
}

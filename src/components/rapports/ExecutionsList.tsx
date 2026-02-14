"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";

interface Execution {
  id: string;
  rapportCode: string;
  libelle: string;
  format: string;
  status: string;
  fileSize?: number | null;
  executedAt: Date | string;
  hasFile: boolean;
}

interface ExecutionsListProps {
  executions: Execution[];
  onDownload: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function iconForFormat(format: string) {
  switch (format) {
    case "excel":
      return <FileSpreadsheet className="h-4 w-4" />;
    case "pdf":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileDown className="h-4 w-4" />;
  }
}

export function ExecutionsList({ executions, onDownload }: ExecutionsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des exécutions</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Aucune exécution</p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {executions.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  {iconForFormat(e.format)}
                  <div>
                    <p className="font-medium text-sm">{e.libelle}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.executedAt)} · {e.format.toUpperCase()}
                      {e.fileSize != null && ` · ${formatFileSize(e.fileSize)}`}
                    </p>
                  </div>
                </div>
                {e.hasFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(e.id)}
                  >
                    Télécharger
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

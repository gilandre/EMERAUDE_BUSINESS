"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface Deadline {
  id: string;
  code: string;
  libelle: string;
  dateFin: Date | string;
}

interface DeadlinesListProps {
  deadlines: Deadline[];
}

function joursRestants(d: Date | string): number {
  const fin = new Date(d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function DeadlinesList({ deadlines }: DeadlinesListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          📅 Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune échéance proche
          </p>
        ) : (
          <div className="space-y-2">
            {deadlines.map((d) => {
              const j = joursRestants(d.dateFin);
              return (
                <Link
                  key={d.id}
                  href={`/marches/${d.id}`}
                  className="flex items-center justify-between rounded-md border p-2 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{d.libelle}</p>
                    <p className="text-xs text-muted-foreground">{d.code}</p>
                  </div>
                  <p className="text-xs font-medium">
                    Dans {j}j
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

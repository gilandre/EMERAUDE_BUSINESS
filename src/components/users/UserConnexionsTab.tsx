"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { LogIn, XCircle } from "lucide-react";

interface UserConnexionsTabProps {
  userId: string;
}

export function UserConnexionsTab({ userId }: UserConnexionsTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["user-connexions", userId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        action: "LOGIN,LOGIN_FAILED",
      });
      const res = await fetch(`/api/users/${userId}/audit?${params}`);
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Aucun historique de connexion
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {logs.map((log: { id: string; action: string; description?: string; ipAddress?: string; createdAt: string }) => {
          const isSuccess = log.action === "LOGIN";
          return (
            <div
              key={log.id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                isSuccess ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
              }`}
            >
              {isSuccess ? (
                <LogIn className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={isSuccess ? "default" : "destructive"} className="text-xs">
                    {isSuccess ? "Connexion réussie" : "Échec connexion"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                {log.ipAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    IP : {log.ipAddress}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="py-2 text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

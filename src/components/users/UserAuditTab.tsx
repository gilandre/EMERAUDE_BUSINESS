"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface UserAuditTabProps {
  userId: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  LOGIN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  LOGIN_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export function UserAuditTab({ userId }: UserAuditTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["user-audit", userId, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
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
        Aucune entrée dans le journal d&apos;audit
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entité</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Par</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: { id: string; action: string; entity: string; entityId?: string; description?: string; ipAddress?: string; createdAt: string; user?: { email: string } }) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(log.createdAt)}
              </TableCell>
              <TableCell>
                <Badge className={`text-xs ${ACTION_COLORS[log.action] ?? ""}`}>
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{log.entity}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate" title={log.description ?? ""}>
                {log.description ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {log.user?.email ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {log.ipAddress ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

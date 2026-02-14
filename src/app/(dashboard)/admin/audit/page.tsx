"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Search, FileDown, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    userId: "",
    entity: "",
    action: "",
    from: "",
    to: "",
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit", page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  const handleExport = (format: "csv" | "json") => {
    const params = new URLSearchParams({ export: format });
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    window.open(`/api/audit?${params}`, "_blank");
    toast.success(`Export ${format.toUpperCase()} lancé`);
  };

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const actionCounts = (logs as { action: string }[]).reduce((acc, l) => {
    acc[l.action] = (acc[l.action] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Audit trail</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
            Export JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques (page courante)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(actionCounts).map(([action, count]) => (
              <div key={action} className="rounded-lg border px-4 py-2">
                <span className="text-sm text-muted-foreground">{action}</span>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
            {Object.keys(actionCounts).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recherche avancée</CardTitle>
          <div className="flex flex-wrap gap-4 mt-4">
            <div>
              <Label className="text-xs">User ID</Label>
              <Input
                placeholder="ID utilisateur"
                value={filters.userId}
                onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
                className="mt-1 w-48"
              />
            </div>
            <div>
              <Label className="text-xs">Entité</Label>
              <select
                className="mt-1 h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.entity}
                onChange={(e) => setFilters((p) => ({ ...p, entity: e.target.value }))}
              >
                <option value="">— Toutes —</option>
                <option value="Marche">Marche</option>
                <option value="Accompte">Accompte</option>
                <option value="Decaissement">Decaissement</option>
                <option value="User">User</option>
                <option value="Profil">Profil</option>
                <option value="Alerte">Alerte</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <select
                className="mt-1 h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.action}
                onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              >
                <option value="">— Toutes —</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Du</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setPage(1)} className="self-end">
              <Search className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Chargement...</div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Réessayer</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: { id: string; createdAt: string; action: string; entity: string; description: string | null; user?: { email?: string } }) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell><span className="font-mono text-xs">{log.action}</span></TableCell>
                      <TableCell>{log.entity}</TableCell>
                      <TableCell className="text-sm">{(log.user as { email?: string })?.email ?? "—"}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">{log.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">{total} résultat(s)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                  <span className="py-2 text-sm">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

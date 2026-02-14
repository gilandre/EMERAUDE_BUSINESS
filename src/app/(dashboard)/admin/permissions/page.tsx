"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Key } from "lucide-react";

type Permission = {
  id: string;
  code: string;
  libelle: string;
  module: string;
  description: string | null;
};

export default function AdminPermissionsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur chargement");
      }
      return res.json();
    },
  });

  const byModule = (data?.byModule ?? {}) as Record<string, Permission[]>;
  const modules = Object.keys(byModule).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/utilisateurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Permissions</h1>
        </div>
        <Link href="/admin/profils">
          <Button variant="outline" size="sm">
            <Key className="h-4 w-4 mr-2" />
            Gérer les profils
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des permissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vue en lecture seule. Les permissions sont assignées aux profils dans la section Profils.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Réessayer
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {modules.map((module) => (
                <div key={module}>
                  <h3 className="text-lg font-semibold mb-3 capitalize">{module}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byModule[module]?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.code}</TableCell>
                          <TableCell>{p.libelle}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.description ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

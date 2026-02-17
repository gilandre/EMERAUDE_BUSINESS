"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivitesFiltersDropdown, type ActivitesFiltersState } from "@/components/activites/ActivitesFiltersDropdown";
import { ActivitesExportMenu } from "@/components/activites/ActivitesExportMenu";
import { ActivitesTable } from "@/components/activites/ActivitesTable";
import { usePermissions } from "@/hooks/usePermissions";

function buildParams(
  page: number,
  pageSize: number,
  q: string,
  filters: ActivitesFiltersState,
  sortBy: string,
  sortOrder: string
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (q) params.set("search", q);
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.statut.length) params.set("statut", filters.statut.join(","));
  if (filters.deviseCode) params.set("deviseCode", filters.deviseCode);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  return params;
}

const PAGE_SIZES = [10, 20, 50];

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 px-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-3 border-t">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-[180px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
          <Skeleton className="h-5 w-[70px] rounded-full" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
          <Skeleton className="h-4 w-[90px]" />
          <Skeleton className="h-4 w-[90px]" />
          <Skeleton className="h-4 w-[90px]" />
        </div>
      ))}
    </div>
  );
}

export default function ActivitesListPage() {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<ActivitesFiltersState>({
    type: [],
    statut: [],
    deviseCode: "",
    dateFrom: "",
    dateTo: "",
  });
  const [filtersApplied, setFiltersApplied] = useState(filters);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filtersApplied.type.length) count++;
    if (filtersApplied.statut.length) count++;
    if (filtersApplied.deviseCode) count++;
    if (filtersApplied.dateFrom) count++;
    if (filtersApplied.dateTo) count++;
    return count;
  }, [filtersApplied]);

  const { data: permsData } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/permissions");
      if (!res.ok) return { permissions: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const perms = usePermissions((permsData?.permissions ?? []) as string[]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activites", page, pageSize, q, filtersApplied, sortBy, sortOrder],
    queryFn: async () => {
      const params = buildParams(page, pageSize, q, filtersApplied, sortBy, sortOrder);
      const res = await fetch(`/api/activites?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur chargement activités");
      }
      return res.json();
    },
    retry: 1,
  });

  // Prefetch next page
  useEffect(() => {
    if (data && page < (data.totalPages ?? 0)) {
      const nextParams = buildParams(page + 1, pageSize, q, filtersApplied, sortBy, sortOrder);
      queryClient.prefetchQuery({
        queryKey: ["activites", page + 1, pageSize, q, filtersApplied, sortBy, sortOrder],
        queryFn: () => fetch(`/api/activites?${nextParams}`).then((r) => r.json()),
      });
    }
  }, [data, page, pageSize, q, filtersApplied, sortBy, sortOrder, queryClient]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setFiltersApplied(filters);
    setPage(1);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? (data?.data ?? []).map((a: { id: string }) => a.id) : []);
  };

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Activités ({total})
        </h1>
        <Link href="/activites/nouvelle">
          <Button>+ Nouvelle Activité</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des activités</CardTitle>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="Rechercher..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" variant="secondary">
                Rechercher
              </Button>
            </form>
            <ActivitesFiltersDropdown
              filters={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              activeCount={activeFilterCount}
            />
            {perms.has("activites:export") && (
              <ActivitesExportMenu
                items={items}
                selectedIds={selectedIds}
                containerRef={containerRef}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="mb-4 flex items-center gap-2 p-2 bg-muted rounded-md">
              <span className="text-sm">{selectedIds.length} sélectionné(s)</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Tout désélectionner
              </Button>
            </div>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="py-6 space-y-2">
              <p className="text-destructive text-sm">{error?.message ?? "Erreur de chargement"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Aucune activité</p>
              <Link href="/activites/nouvelle" className="mt-2 inline-block">
                <Button variant="outline" size="sm">Créer une activité</Button>
              </Link>
            </div>
          ) : (
            <ActivitesTable
              items={items}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          )}

          {items.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Par page:</span>
                {PAGE_SIZES.map((s) => (
                  <Button
                    key={s}
                    variant={pageSize === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setPageSize(s); setPage(1); }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Précédent
                </Button>
                <span className="text-sm">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

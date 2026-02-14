"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, List } from "lucide-react";
import { MarchesFiltersDropdown, type MarchesFiltersState } from "@/components/marches/MarchesFiltersDropdown";
import { MarchesExportMenu } from "@/components/marches/MarchesExportMenu";
import { MarchesTable } from "@/components/marches/MarchesTable";
import { MarchesCardsView } from "@/components/marches/MarchesCardsView";

function buildParams(
  page: number,
  pageSize: number,
  q: string,
  filters: MarchesFiltersState,
  sortBy: string,
  sortOrder: string
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("counts", "true");
  if (q) params.set("q", q);
  if (filters.statut.length) params.set("statut", filters.statut.join(","));
  if (filters.devise.length) params.set("devise", filters.devise.join(","));
  if (filters.tresorerie) params.set("tresorerie", filters.tresorerie);
  if (filters.prefinancement) params.set("prefinancement", filters.prefinancement);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  return params;
}

const PAGE_SIZES = [10, 20, 50, 100];

export default function MarchesListPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<MarchesFiltersState>({
    statut: [],
    devise: [],
    tresorerie: "",
    prefinancement: "",
    dateFrom: "",
    dateTo: "",
  });
  const [filtersApplied, setFiltersApplied] = useState(filters);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["marches", page, pageSize, q, filtersApplied, sortBy, sortOrder],
    queryFn: async () => {
      const params = buildParams(page, pageSize, q, filtersApplied, sortBy, sortOrder);
      const res = await fetch(`/api/marches?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur chargement marchés");
      }
      return res.json();
    },
    retry: 1,
  });

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
    setSortBy(col);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? (data?.data ?? []).map((m: { id: string }) => m.id) : []);
  };

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const counts = data?.counts ?? {};

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          📊 Marchés ({total})
        </h1>
        <Link href="/marches/nouveau">
          <Button>+ Nouveau Marché</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des marchés</CardTitle>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="🔍 Rechercher..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" variant="secondary">
                Rechercher
              </Button>
            </form>
            <MarchesFiltersDropdown
              filters={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              counts={counts}
            />
            <MarchesExportMenu
              items={items}
              selectedIds={selectedIds}
              containerRef={containerRef}
            />
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
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
            <Skeleton className="h-64 w-full" />
          ) : isError ? (
            <div className="py-6 space-y-2">
              <p className="text-destructive text-sm">{error?.message ?? "Erreur de chargement"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Aucun marché</p>
          ) : viewMode === "table" ? (
            <MarchesTable
              items={items}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <MarchesCardsView items={items} />
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

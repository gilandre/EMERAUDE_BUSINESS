"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { KPICards } from "@/components/dashboards/KPICards";
import { DashboardFilters, type Period } from "@/components/dashboards/DashboardFilters";
import { MarchesAttentionList } from "@/components/dashboards/MarchesAttentionList";
import { DeadlinesList } from "@/components/dashboards/DeadlinesList";
import { RecentAlertsList } from "@/components/dashboards/RecentAlertsList";
import { RecentActivityList } from "@/components/dashboards/RecentActivityList";
import { DashboardExportButton } from "@/components/dashboards/DashboardExportButton";
import { DashboardQuickActions } from "@/components/dashboards/DashboardQuickActions";

const TreasuryLineChart = dynamic(
  () => import("@/components/dashboards/TreasuryLineChart").then((m) => ({ default: m.TreasuryLineChart })),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> }
);
const EncDecBarChart = dynamic(
  () => import("@/components/dashboards/EncDecBarChart").then((m) => ({ default: m.EncDecBarChart })),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> }
);
const DecByCategoryPieChart = dynamic(
  () => import("@/components/dashboards/DecByCategoryPieChart").then((m) => ({ default: m.DecByCategoryPieChart })),
  { loading: () => <Skeleton className="h-48 w-full rounded-lg" /> }
);
const DeviseExpositionChart = dynamic(
  () => import("@/components/dashboards/DeviseExpositionChart").then((m) => ({ default: m.DeviseExpositionChart })),
  { loading: () => <Skeleton className="h-48 w-full rounded-lg" /> }
);

function buildUrl(period: Period) {
  const params = new URLSearchParams();
  params.set("period", period);
  return `/api/dashboard?${params.toString()}`;
}

export default function DashboardPage() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<Period>("30d");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: async () => {
      const res = await fetch(buildUrl(period));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur chargement dashboard");
      }
      return res.json();
    },
    retry: 1,
    refetchInterval: 60000,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-destructive">{error?.message ?? "Erreur de chargement"}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const chartData = data?.chartData ?? [];
  const treasuryEvolution = data?.treasuryEvolution ?? [];
  const forecast = data?.forecast ?? [];
  const decByCategory = data?.decByCategory ?? [];
  const decByDevise = data?.decByDevise ?? [];
  const decByBeneficiary = data?.decByBeneficiary ?? [];
  const deviseExposition = data?.deviseExposition ?? [];
  const seuilCritique = data?.seuilCritique ?? 0;
  const conversionRates = kpis.conversionRates ?? { EUR: 655.957, USD: 600 };
  const marchesAttention = data?.marchesAttention ?? [];
  const deadlines = data?.deadlines ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const recentMarches = data?.recentMarches ?? [];
  const totalExposition = deviseExposition.reduce((s: number, d: { value: number }) => s + d.value, 0);

  return (
    <div ref={dashboardRef} className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardFilters period={period} onPeriodChange={setPeriod} />
          <DashboardExportButton dashboardRef={dashboardRef} />
          <Link href="/marches/nouveau">
            <Button>+ Nouveau marché</Button>
          </Link>
        </div>
      </div>

      <KPICards kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TreasuryLineChart
          data={treasuryEvolution}
          forecast={forecast}
          seuilCritique={seuilCritique}
          conversionRates={conversionRates}
        />
        <div className="space-y-4">
          <EncDecBarChart data={chartData} />
          <div className="grid gap-4 md:grid-cols-2">
            <DecByCategoryPieChart
              data={decByCategory}
              decByDevise={decByDevise}
              decByBeneficiary={decByBeneficiary}
            />
            <DeviseExpositionChart data={deviseExposition} total={totalExposition} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MarchesAttentionList marches={marchesAttention} />
        <DeadlinesList deadlines={deadlines} />
        <RecentAlertsList alerts={recentAlerts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityList logs={recentActivity} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Marchés récents</CardTitle>
            <Link href="/marches">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentMarches.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Aucun marché</p>
            ) : (
              <div className="space-y-2">
                {recentMarches.map(
                  (m: {
                    id: string;
                    code: string;
                    libelle: string;
                    montant: number;
                    montantXOF?: number;
                    deviseCode?: string;
                    statut: string;
                    updatedAt: string;
                    _count: { accomptes: number; decaissements: number };
                  }) => (
                    <Link
                      key={m.id}
                      href={`/marches/${m.id}`}
                      className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{m.libelle}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.code} · {m._count?.accomptes ?? 0} accomptes ·{" "}
                          {m._count?.decaissements ?? 0} décaissements
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          <MontantDisplay
                            montant={m.montantXOF ?? m.montant}
                            deviseCode={m.deviseCode ?? "XOF"}
                          />
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(m.updatedAt)}</p>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardQuickActions />
    </div>
  );
}

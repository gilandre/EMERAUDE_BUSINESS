"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { formatDate } from "@/lib/utils";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Activity,
  TrendingUp,
  Zap,
  Users,
  BarChart3,
  HardDrive,
  Server,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["monitoring"],
    queryFn: async () => {
      const res = await fetch("/api/monitoring");
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Monitoring</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const health = data?.health ?? {};
  const services = health.services ?? {};
  const redis = data?.redis ?? {};
  const statusColor = (s: string) =>
    s === "up" || s === "healthy" ? "text-green-600" : s === "warning" ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monitoring</h1>
        <Badge variant={health.status === "healthy" ? "default" : "destructive"}>
          {health.status ?? "Inconnu"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            {services.database?.status === "up" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusColor(services.database?.status ?? "")}`}>
              {services.database?.status ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {services.database?.responseTime != null
                ? `${services.database.responseTime} ms`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Redis</CardTitle>
            {services.redis?.status === "up" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusColor(services.redis?.status ?? "")}`}>
              {services.redis?.status ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {services.redis?.responseTime != null ? `${services.redis.responseTime} ms` : ""}
              {redis.status === "up" && redis.usedMemoryMb != null && (
                <> · {redis.usedMemoryMb} MB · {redis.keysCount ?? 0} clés</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mémoire (processus)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusColor(services.memory?.status ?? "")}`}>
              {services.memory?.usage != null ? `${services.memory.usage}%` : data?.metrics?.processHeapUsagePct != null ? `${data.metrics.processHeapUsagePct}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {data?.metrics?.processHeapUsedMb != null && data?.metrics?.processHeapTotalMb != null
                ? `${data.metrics.processHeapUsedMb} / ${data.metrics.processHeapTotalMb} MB heap`
                : services.memory?.status ?? ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disque</CardTitle>
            <HardDrive className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusColor(services.disk?.status ?? "")}`}>
              {services.disk?.usage != null ? `${services.disk.usage}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {services.disk?.status ?? ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {health.uptime != null ? `${Math.floor(health.uptime / 60)} min` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {health.timestamp ? formatDate(health.timestamp) : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métriques temps réel (Prometheus)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Requêtes HTTP et erreurs des routes instrumentées · Cache Redis · Sessions actives
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Requêtes HTTP</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{data?.metrics?.httpRequests ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Erreurs</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-red-600">{data?.metrics?.httpErrors ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Cache hit rate</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{data?.metrics?.cacheHitRate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">
                {data?.metrics?.cacheHits ?? 0} hits / {data?.metrics?.cacheMisses ?? 0} misses
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">Sessions actives</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{data?.metrics?.activeUsers ?? 0}</p>
            </div>
            {redis.status === "up" && (
              <>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Server className="h-4 w-4" />
                    <span className="text-sm">Redis mémoire</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{redis.usedMemoryMb ?? 0} MB</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">Redis clés</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{redis.keysCount ?? 0}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertes configurées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.alertes?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte active</p>
            ) : (
              <ul className="space-y-2">
                {data?.alertes?.map((a: { id: string; code: string; libelle: string }) => (
                  <li key={a.id} className="flex items-center justify-between rounded border p-2">
                    <span className="font-medium">{a.libelle}</span>
                    <Badge variant="outline">{a.code}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {data?.recentLogs?.map((log: { id: string; action: string; entity: string; description: string | null; createdAt: string }) => (
                <div
                  key={log.id}
                  className="rounded border p-2 text-sm"
                >
                  <p className="font-medium">
                    {log.action} · {log.entity}
                  </p>
                  {log.description && (
                    <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métriques métier</CardTitle>
          <p className="text-sm text-muted-foreground">Marchés actifs et montant total (XOF)</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Marchés actifs</p>
              <p className="text-2xl font-bold">{data?.marcheStats?.count ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant total</p>
              <p className="text-2xl font-bold">
                <MontantDisplay montant={data?.marcheStats?.totalMontantXOF ?? 0} deviseCode="XOF" />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Health JSON
        </a>
        <a
          href="/api/metrics"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Prometheus Metrics
        </a>
      </div>
    </div>
  );
}

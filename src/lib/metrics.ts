import { Registry, Counter, Histogram, Gauge } from "prom-client";

export const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total HTTP errors",
  labelNames: ["route", "type"],
  registers: [register],
});

export const dbQueriesTotal = new Counter({
  name: "db_queries_total",
  help: "Total database queries",
  labelNames: ["operation"],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const cacheHitsTotal = new Counter({
  name: "cache_hits_total",
  help: "Cache hits",
  labelNames: ["key_prefix"],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: "cache_misses_total",
  help: "Cache misses",
  labelNames: ["key_prefix"],
  registers: [register],
});

export const activeUsersGauge = new Gauge({
  name: "active_users",
  help: "Number of active users",
  registers: [register],
});

export const queueLengthGauge = new Gauge({
  name: "queue_length",
  help: "Queue length",
  labelNames: ["queue"],
  registers: [register],
});

function isMetricWithValues(m: unknown): m is { name: string; values: Array<{ value: number }> } {
  return typeof m === "object" && m !== null && "values" in m;
}

function getMetricValue(metrics: unknown[], name: string): number {
  const m = metrics.find((x) => (x as { name: string }).name === name);
  if (!m || !isMetricWithValues(m)) return 0;
  const values = m.values;
  return values?.reduce((s, v) => s + (v.value ?? 0), 0) ?? 0;
}

function getGaugeValue(metrics: unknown[], name: string): number {
  const m = metrics.find((x) => (x as { name: string }).name === name);
  if (!m || !isMetricWithValues(m)) return 0;
  const values = m.values;
  return values?.[0]?.value ?? 0;
}

export async function getMetricsSnapshot() {
  const metrics = await register.getMetricsAsJSON();
  const httpRequests = getMetricValue(metrics, "http_requests_total");
  const httpErrors = getMetricValue(metrics, "http_errors_total");
  const cacheHits = getMetricValue(metrics, "cache_hits_total");
  const cacheMisses = getMetricValue(metrics, "cache_misses_total");
  const cacheTotal = cacheHits + cacheMisses;
  const activeUsers = getGaugeValue(metrics, "active_users");

  // Métriques processus (prom-client collectDefaultMetrics)
  const processResidentMemory = getGaugeValue(metrics, "process_resident_memory_bytes");
  const processHeapUsed = getGaugeValue(metrics, "nodejs_heap_size_used_bytes");
  const processHeapTotal = getGaugeValue(metrics, "nodejs_heap_size_total_bytes");
  const heapUsagePct =
    processHeapTotal > 0 ? Math.round((processHeapUsed / processHeapTotal) * 100) : 0;

  return {
    httpRequests,
    httpErrors,
    cacheHits,
    cacheMisses,
    cacheHitRate: cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) : 0,
    activeUsers,
    processResidentMemoryMb: Math.round(processResidentMemory / 1024 / 1024),
    processHeapUsedMb: Math.round(processHeapUsed / 1024 / 1024),
    processHeapTotalMb: Math.round(processHeapTotal / 1024 / 1024),
    processHeapUsagePct: heapUsagePct,
  };
}

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // Métriques Prometheus par défaut (CPU, mémoire, event loop, etc.)
    const { register } = await import("./src/lib/metrics");
    const { collectDefaultMetrics } = await import("prom-client");
    collectDefaultMetrics({ register });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

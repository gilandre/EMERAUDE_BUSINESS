/**
 * Wrapper pour instrumenter les routes API avec les métriques Prometheus + rate limiting.
 * Usage: export const GET = withApiMetrics(handler, "api/health");
 */
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
} from "@/lib/metrics";
import { consumeRateLimit } from "@/lib/rate-limit";

export type RouteContext = { params: Promise<Record<string, string>> };

export function withApiMetrics<T extends RouteContext>(
  handler: (req: Request, context: T) => Promise<Response> | Response,
  routeName: string,
  options?: { skipRateLimit?: boolean }
) {
  return async (req: Request, context: T): Promise<Response> => {
    if (!options?.skipRateLimit) {
      const rateLimitRes = await consumeRateLimit(req);
      if (rateLimitRes) return rateLimitRes;
    }
    const start = Date.now();
    const method = req.method;
    try {
      const res = await handler(req, context);
      const status = res.status.toString();
      httpRequestsTotal.inc({ method, route: routeName, status });
      httpRequestDuration.observe({ method, route: routeName }, (Date.now() - start) / 1000);
      if (res.status >= 400) {
        httpErrorsTotal.inc({
          route: routeName,
          type: res.status >= 500 ? "server" : "client",
        });
      }
      return res;
    } catch (e) {
      httpRequestsTotal.inc({ method, route: routeName, status: "500" });
      httpErrorsTotal.inc({ route: routeName, type: "server" });
      throw e;
    }
  };
}

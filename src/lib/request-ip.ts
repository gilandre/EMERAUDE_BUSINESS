/**
 * Extract client IP address from incoming request headers.
 * Works with both Request and NextRequest objects.
 */
export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? null;
}

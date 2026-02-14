/**
 * Protection CSRF pour formulaires et actions sensibles.
 */

import { randomBytes } from "crypto";

const CSRF_TOKEN_COOKIE = "csrf_token";
const CSRF_TOKEN_HEADER = "x-csrf-token";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

function getCookieFromRequest(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const header = request.headers.get(CSRF_TOKEN_HEADER);
  if (header) return header;
  return getCookieFromRequest(request, CSRF_TOKEN_COOKIE);
}

export async function getCsrfTokenFromBody(request: Request): Promise<string | null> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      return body?._csrf ?? body?.csrfToken ?? null;
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.formData();
      return body.get("_csrf") as string | null;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function validateCsrf(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  const bodyToken = await getCsrfTokenFromBody(request);
  const cookieToken = getCookieFromRequest(request, CSRF_TOKEN_COOKIE);

  const providedToken = headerToken ?? bodyToken;
  if (!providedToken || !cookieToken) return false;
  return providedToken === cookieToken && providedToken.length === 64;
}

export { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER };

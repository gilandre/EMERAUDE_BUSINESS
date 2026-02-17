import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

type NextAuthCtx = { params: Promise<{ nextauth: string[] }> };

async function withRateLimit(req: Request, ctx: NextAuthCtx) {
  const rateLimitRes = await consumeRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  return handler(req, ctx as unknown as { params: Promise<Record<string, string>> });
}

export async function GET(req: Request, ctx: NextAuthCtx) {
  return withRateLimit(req, ctx);
}
export async function POST(req: Request, ctx: NextAuthCtx) {
  return withRateLimit(req, ctx);
}

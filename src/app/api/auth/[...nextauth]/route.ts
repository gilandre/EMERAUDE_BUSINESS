import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

async function withRateLimit(
  req: Request,
  ctx: { params: Promise<Record<string, string>> }
) {
  const rateLimitRes = await consumeRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  return handler(req, ctx);
}

export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  return withRateLimit(req, ctx);
}
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  return withRateLimit(req, ctx);
}

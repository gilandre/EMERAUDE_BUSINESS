import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";

const PRESENCE_TTL = 35;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = `presence:${session.user.id}`;
  await redis.setex(key, PRESENCE_TTL, Date.now().toString());

  return NextResponse.json({ ok: true });
}

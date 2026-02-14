import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await redis.keys("presence:*");
  const onlineUserIds: string[] = [];
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      const userId = key.replace("presence:", "");
      onlineUserIds.push(userId);
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: onlineUserIds } },
    select: { id: true, email: true, name: true },
  });

  const isCurrentUserOnline = onlineUserIds.includes(session.user.id);

  return NextResponse.json({
    onlineCount: onlineUserIds.length,
    onlineUsers: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isMe: u.id === session.user.id,
    })),
    isCurrentUserOnline,
  });
}

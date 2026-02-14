import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { userId: session.user.id },
  });

  if (!prefs) {
    return NextResponse.json({
      canalInApp: true,
      canalEmail: true,
      canalPush: false,
      alertTypes: [],
      quietHoursStart: null,
      quietHoursEnd: null,
      digestFrequency: "realtime",
    });
  }

  return NextResponse.json({
    canalInApp: prefs.canalInApp,
    canalEmail: prefs.canalEmail,
    canalPush: prefs.canalPush,
    alertTypes: prefs.alertTypes,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    digestFrequency: prefs.digestFrequency,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    canalInApp,
    canalEmail,
    canalPush,
    alertTypes,
    quietHoursStart,
    quietHoursEnd,
    digestFrequency,
  } = body;

  const prefs = await prisma.userNotificationPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      ...(typeof canalInApp === "boolean" && { canalInApp }),
      ...(typeof canalEmail === "boolean" && { canalEmail }),
      ...(typeof canalPush === "boolean" && { canalPush }),
      ...(Array.isArray(alertTypes) && { alertTypes }),
      ...(quietHoursStart !== undefined && { quietHoursStart: quietHoursStart || null }),
      ...(quietHoursEnd !== undefined && { quietHoursEnd: quietHoursEnd || null }),
      ...(digestFrequency && { digestFrequency }),
    },
    create: {
      userId: session.user.id,
      canalInApp: canalInApp ?? true,
      canalEmail: canalEmail ?? true,
      canalPush: canalPush ?? false,
      alertTypes: Array.isArray(alertTypes) ? alertTypes : [],
      quietHoursStart: quietHoursStart || null,
      quietHoursEnd: quietHoursEnd || null,
      digestFrequency: digestFrequency ?? "realtime",
    },
  });

  return NextResponse.json(prefs);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createDiscussionSchema } from "@/validations/discussion.schema";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "discussions:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType et entityId requis" },
      { status: 400 }
    );
  }

  try {
    const list = await prisma.discussion.findMany({
      where: { entityType, entityId },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            contenu: true,
            createdAt: true,
            auteur: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      list.map((d) => ({
        ...d,
        lastMessage: d.messages[0] || null,
        messages: undefined,
      }))
    );
  } catch (error) {
    console.error("Erreur GET discussions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "discussions:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDiscussionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const discussion = await prisma.discussion.create({
      data: {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        sujet: parsed.data.sujet ?? null,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Discussion",
        entityId: discussion.id,
        newData: {
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          sujet: parsed.data.sujet,
        },
        description: `Discussion créée sur ${parsed.data.entityType} ${parsed.data.entityId}${parsed.data.sujet ? `: ${parsed.data.sujet}` : ""}`,
      },
    });

    return NextResponse.json(discussion, { status: 201 });
  } catch (error) {
    console.error("Erreur POST discussion:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

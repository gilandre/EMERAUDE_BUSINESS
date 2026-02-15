import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createMessageSchema } from "@/validations/discussion.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "discussions:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Verify discussion exists
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!discussion) {
      return NextResponse.json({ error: "Discussion introuvable" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { discussionId: id },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          auteur: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.message.count({ where: { discussionId: id } }),
    ]);

    return NextResponse.json({
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET discussion messages:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "discussions:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Verify discussion exists and is open
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, statut: true, entityType: true, entityId: true },
    });
    if (!discussion) {
      return NextResponse.json({ error: "Discussion introuvable" }, { status: 404 });
    }
    if (discussion.statut !== "OUVERTE") {
      return NextResponse.json(
        { error: "Cette discussion est fermée" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        discussionId: id,
        contenu: parsed.data.contenu,
        type: parsed.data.type,
        auteurId: session.user.id,
      },
      include: {
        auteur: { select: { id: true, name: true, email: true } },
      },
    });

    // Update discussion updatedAt
    await prisma.discussion.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Message",
        entityId: message.id,
        newData: { discussionId: id, type: parsed.data.type },
        description: `Message envoyé dans la discussion ${id} (${discussion.entityType} ${discussion.entityId})`,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Erreur POST discussion message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

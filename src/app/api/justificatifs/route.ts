import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { createJustificatifSchema } from "@/validations/justificatif.schema";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "justificatifs:read");
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
    const list = await prisma.justificatif.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("Erreur GET justificatifs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canCreate = await hasPermission(session.user.id, "justificatifs:create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;
    const description = formData.get("description") as string | null;

    // Validate metadata
    const parsed = createJustificatifSchema.safeParse({
      entityType,
      entityId,
      description: description || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 Mo)" },
        { status: 400 }
      );
    }

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), "uploads", "justificatifs");
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${timestamp}_${safeFileName}`;
    const filePath = path.join(uploadsDir, storedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const justificatif = await prisma.justificatif.create({
      data: {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        filePath: `uploads/justificatifs/${storedName}`,
        description: parsed.data.description ?? null,
        uploadedById: session.user.id,
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Justificatif",
        entityId: justificatif.id,
        newData: {
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          fileName: file.name,
        },
        description: `Justificatif uploadé: ${file.name} pour ${parsed.data.entityType} ${parsed.data.entityId}`,
      },
    });

    return NextResponse.json(justificatif, { status: 201 });
  } catch (error) {
    console.error("Erreur POST justificatif:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

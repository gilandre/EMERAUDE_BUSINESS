import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { readFile, unlink } from "fs/promises";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canRead = await hasPermission(session.user.id, "justificatifs:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const justificatif = await prisma.justificatif.findUnique({ where: { id } });
    if (!justificatif) {
      return NextResponse.json({ error: "Justificatif introuvable" }, { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), justificatif.filePath);

    try {
      const fileBuffer = await readFile(absolutePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": justificatif.mimeType,
          "Content-Disposition": `attachment; filename="${justificatif.fileName}"`,
          "Content-Length": String(justificatif.fileSize),
        },
      });
    } catch {
      return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
    }
  } catch (error) {
    console.error("Erreur GET justificatif:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canDelete = await hasPermission(session.user.id, "justificatifs:delete");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const justificatif = await prisma.justificatif.findUnique({ where: { id } });
    if (!justificatif) {
      return NextResponse.json({ error: "Justificatif introuvable" }, { status: 404 });
    }

    // Remove file from disk
    const absolutePath = path.join(process.cwd(), justificatif.filePath);
    try {
      await unlink(absolutePath);
    } catch {
      // File may already be deleted, continue with DB cleanup
    }

    await prisma.justificatif.delete({ where: { id } });

    void prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "Justificatif",
        entityId: id,
        description: `Justificatif supprimé: ${justificatif.fileName} (${justificatif.entityType} ${justificatif.entityId})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE justificatif:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

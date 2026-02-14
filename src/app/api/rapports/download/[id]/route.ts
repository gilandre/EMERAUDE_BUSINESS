import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "rapports");

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  json: "application/json",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const execution = await prisma.rapportExecution.findUnique({
    where: { id },
  });

  if (!execution?.filePath) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, execution.filePath);
  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(execution.filePath).slice(1);
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const safeName = `${execution.libelle.replace(/[^a-z0-9-]/gi, "_")}.${ext}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}

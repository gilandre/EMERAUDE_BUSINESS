import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeReportQuery } from "@/lib/reports/runner";
import { exportToExcel, exportToPdf, exportToCsv, exportToJson, type ExportFormat } from "@/lib/reports/exporters";
import { REPORT_TEMPLATES } from "@/lib/reports/templates";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "rapports");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { templateCode, format = "excel", config } = body as {
      templateCode: string;
      format?: ExportFormat;
      config?: object;
    };

    const template = REPORT_TEMPLATES.find((t) => t.code === templateCode);
    if (!template) {
      return NextResponse.json({ error: "Template inconnu" }, { status: 400 });
    }

    const queryConfig = config ?? template.config;
    const data = await executeReportQuery(queryConfig as never, templateCode);

    const validFormats = ["pdf", "excel", "csv", "json"] as const;
    const fmt = validFormats.includes(format as never) ? (format as ExportFormat) : "excel";

    let buffer: Buffer;
    let contentType: string;
    let ext: string;

    switch (fmt) {
      case "excel":
        buffer = await exportToExcel(data, template.libelle);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        ext = "xlsx";
        break;
      case "pdf":
        buffer = exportToPdf(data, template.libelle);
        contentType = "application/pdf";
        ext = "pdf";
        break;
      case "csv":
        buffer = Buffer.from(exportToCsv(data), "utf-8");
        contentType = "text/csv";
        ext = "csv";
        break;
      case "json":
        buffer = Buffer.from(exportToJson(data), "utf-8");
        contentType = "application/json";
        ext = "json";
        break;
      default:
        buffer = await exportToExcel(data, template.libelle);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        ext = "xlsx";
    }

    const rapport = await prisma.rapport.upsert({
      where: { code: templateCode },
      update: {},
      create: {
        code: templateCode,
        libelle: template.libelle,
        type: template.type,
        config: queryConfig as never,
      },
    });

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${rapport.id}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await writeFile(filePath, buffer);

    const execution = await prisma.rapportExecution.create({
      data: {
        rapportId: rapport.id,
        rapportCode: templateCode,
        libelle: template.libelle,
        format: fmt,
        config: queryConfig as never,
        filePath: filename,
        fileSize: buffer.length,
        status: "completed",
        executedBy: session.user.id,
      },
    });

    return NextResponse.json({
      executionId: execution.id,
      downloadUrl: `/api/rapports/download/${execution.id}`,
      format: fmt,
      rowCount: data.length,
    });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération rapport" },
      { status: 500 }
    );
  }
}

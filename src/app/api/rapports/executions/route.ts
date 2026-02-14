import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const rapportCode = searchParams.get("rapportCode") ?? undefined;

  const executions = await prisma.rapportExecution.findMany({
    where: rapportCode ? { rapportCode } : undefined,
    orderBy: { executedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    data: executions.map((e) => ({
      id: e.id,
      rapportCode: e.rapportCode,
      libelle: e.libelle,
      format: e.format,
      status: e.status,
      fileSize: e.fileSize,
      executedAt: e.executedAt,
      hasFile: !!e.filePath,
    })),
  });
}

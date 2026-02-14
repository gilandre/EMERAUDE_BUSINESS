import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/audit - Liste paginée des logs d'audit
 * Query: page, pageSize OU cursor, take (cursor pagination), userId, entity, action, from, to, export
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canRead = await hasPermission(session.user.id, "audit:read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const takeParam = searchParams.get("take");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const useCursorPagination = cursor != null || takeParam != null;
  const take = useCursorPagination
    ? Math.min(100, Math.max(1, parseInt(takeParam ?? "20", 10)))
    : pageSize;
  const skip = useCursorPagination ? undefined : (page - 1) * pageSize;
  const exportFormat = searchParams.get("export"); // "csv" ou "json"

  const where: { userId?: string; entity?: string; action?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  const userId = searchParams.get("userId");
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const select = {
    id: true,
    userId: true,
    action: true,
    entity: true,
    entityId: true,
    description: true,
    oldData: true,
    newData: true,
    createdAt: true,
    user: { select: { email: true, name: true } },
  };

  const [logsRaw, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: exportFormat ? 0 : skip,
      take: exportFormat === "csv" || exportFormat === "json" ? 5000 : useCursorPagination ? take + 1 : take,
      ...(useCursorPagination && cursor ? { cursor: { id: cursor } } : {}),
      select,
    }),
    exportFormat ? Promise.resolve(0) : prisma.auditLog.count({ where }),
  ]);

  const hasMore = useCursorPagination && logsRaw.length > take;
  const logs = hasMore ? logsRaw.slice(0, take) : logsRaw;
  const nextCursor = hasMore && logs[logs.length - 1] ? (logs[logs.length - 1] as { id: string }).id : null;

  if (exportFormat === "csv") {
    const canExport = await hasPermission(session.user.id, "audit:export");
    if (!canExport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const header = "date;userId;email;action;entity;entityId;description\n";
    const rows = logs
      .map(
        (l) =>
          `${l.createdAt.toISOString()};${l.userId ?? ""};${(l.user as { email?: string })?.email ?? ""};${l.action};${l.entity};${l.entityId ?? ""};${(l.description ?? "").replace(/;/g, ",")}`
      )
      .join("\n");
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (exportFormat === "json") {
    const canExport = await hasPermission(session.user.id, "audit:export");
    if (!canExport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(logs, {
      headers: {
        "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  if (useCursorPagination) {
    return NextResponse.json({
      data: logs,
      nextCursor,
      hasMore: !!nextCursor,
    });
  }

  return NextResponse.json({
    data: logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

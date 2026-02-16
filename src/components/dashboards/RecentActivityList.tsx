"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, PlusCircle, CheckCircle, FileText, Bell, User } from "lucide-react";
import { ACTION_LABELS, ENTITY_LABELS, label } from "@/lib/labels";

interface LogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  createdAt: Date | string;
}

interface RecentActivityListProps {
  logs: LogEntry[];
}

function formatRelative(t: Date | string): string {
  const d = new Date(t);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffJ = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffJ < 7) return `Il y a ${diffJ}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getIcon(action: string, entity: string) {
  if (entity === "Accompte") return <PlusCircle className="h-4 w-4 text-green-600" />;
  if (entity === "Decaissement") return <CheckCircle className="h-4 w-4 text-blue-600" />;
  if (entity === "Marche") return <FileText className="h-4 w-4 text-primary" />;
  if (entity === "Alerte" || entity.includes("alert")) return <Bell className="h-4 w-4 text-amber-600" />;
  if (entity === "User") return <User className="h-4 w-4 text-muted-foreground" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function getHref(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entity === "Marche") return `/marches/${entityId}`;
  if (entity === "Accompte") return "/marches";
  if (entity === "Decaissement") return "/marches";
  return null;
}

export function RecentActivityList({ logs }: RecentActivityListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune activité récente
          </p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {logs.map((l) => {
              const href = getHref(l.entity, l.entityId);
              const content = (
                <>
                  {getIcon(l.action, l.entity)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {label(ACTION_LABELS, l.action)} · {label(ENTITY_LABELS, l.entity)}
                      {l.entityId && (
                        <span className="text-muted-foreground font-normal"> #{l.entityId.slice(-6)}</span>
                      )}
                    </p>
                    {l.description && (
                      <p className="text-xs text-muted-foreground truncate">{l.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatRelative(l.createdAt)}</p>
                  </div>
                </>
              );
              return href ? (
                <Link
                  key={l.id}
                  href={href}
                  className="flex gap-3 rounded-md border p-2 transition-colors hover:bg-muted/50"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={l.id}
                  className="flex gap-3 rounded-md border p-2"
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

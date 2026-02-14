"use client";

import { useState } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bell, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";

interface NotificationItem {
  id: string;
  sujet: string | null;
  corps: string;
  lu: boolean;
  luAt: string | null;
  createdAt: string;
  alerte: { id: string; code: string; libelle: string } | null;
  type: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

type FilterType = "all" | "unread" | "read";

function buildUrl(filter: FilterType, type: string, cursor?: string) {
  const params = new URLSearchParams();
  params.set("limit", "15");
  if (filter === "unread") params.set("lu", "false");
  else if (filter === "read") params.set("lu", "true");
  if (type && type !== "all") params.set("type", type);
  if (cursor) params.set("cursor", cursor);
  return `/api/notifications?${params.toString()}`;
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: badgeData } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=1");
      if (!res.ok) return { unreadCount: 0 };
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["notifications", filter, typeFilter],
      queryFn: async ({ pageParam }) => {
        const res = await fetch(buildUrl(filter, typeFilter, pageParam));
        if (!res.ok) throw new Error("Erreur chargement");
        return res.json();
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
      enabled: open,
      staleTime: 60 * 1000,
    });

  const notifications = data?.pages.flatMap((p) => p.data) ?? [];
  const unreadCount = open
    ? (data?.pages[0]?.unreadCount ?? badgeData?.unreadCount ?? 0)
    : (badgeData?.unreadCount ?? 0);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lu: true }),
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <span className="sr-only">Notifications</span>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 p-0">
        <div className="border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Tout marquer lu
              </Button>
            )}
          </div>
          <div className="mt-2 flex gap-1">
            {(["all", "unread", "read"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Toutes" : f === "unread" ? "Non lues" : "Lues"}
              </Button>
            ))}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                    !n.lu && "bg-muted/30"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="cursor-pointer font-medium"
                      onClick={() => !n.lu && markReadMutation.mutate(n.id)}
                    >
                      {n.sujet ?? n.alerte?.libelle ?? "Alerte"}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-muted-foreground">{n.corps}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100">
                    {!n.lu && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => markReadMutation.mutate(n.id)}
                        disabled={markReadMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(n.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage && (
            <div className="flex justify-center p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Chargement..." : "Charger plus"}
              </Button>
            </div>
          )}
        </div>
        <div className="border-t p-2">
          <Link href="/admin/alertes/historique">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Voir tout l&apos;historique
            </Button>
          </Link>
          <Link href="/profil/notifications">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Préférences
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

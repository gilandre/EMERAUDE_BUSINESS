"use client";

import { useCallback, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  Wallet,
  Settings,
  Users,
  Shield,
  Key,
  Menu as MenuIcon,
  Bell,
  BarChart3,
  FileText,
  Cog,
  Activity,
  DollarSign,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  code: string;
  libelle: string;
  path: string | null;
  icon: string | null;
  ordre: number;
  children: MenuItem[];
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  Wallet,
  Settings,
  Users,
  Shield,
  Key,
  Menu: MenuIcon,
  Bell,
  BarChart3,
  FileText,
  Cog,
  Activity,
  DollarSign,
  FolderOpen,
};

function IconForItem({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null;
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={cn("h-4 w-4 shrink-0", className)} />;
}

const defaultItems: { href: string; label: string; icon: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/marches", label: "Marchés", icon: "Briefcase" },
  { href: "/activites", label: "Activités", icon: "FolderOpen" },
  { href: "/tresorerie", label: "Trésorerie", icon: "Wallet" },
  { href: "/rapports", label: "Rapports", icon: "FileText" },
  { href: "/admin/alertes", label: "Alertes", icon: "Bell" },
];

function hasActiveChild(item: MenuItem, pathname: string): boolean {
  if (item.path && pathname.startsWith(item.path)) return true;
  return item.children?.some((child) => hasActiveChild(child, pathname)) ?? false;
}

function isExactOrChildActive(path: string | null, pathname: string): boolean {
  if (!path) return false;
  return pathname === path || pathname.startsWith(path + "/");
}

function MenuList({ items, level = 0 }: { items: MenuItem[]; level?: number }) {
  const pathname = usePathname();

  const initialExpanded = useMemo(() => {
    const expanded: Record<string, boolean> = {};
    for (const item of items) {
      if (item.children?.length > 0 && hasActiveChild(item, pathname)) {
        expanded[item.id] = true;
      }
    }
    return expanded;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  if (!items.length) return null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ul className={cn("space-y-0.5", level > 0 && "ml-4 mt-1 border-l border-emerald-200/60 pl-2 dark:border-emerald-800/40")}>
      {items.map((item) => {
        const hasChildren = item.children?.length > 0;
        const isExpanded = expanded[item.id] ?? false;
        const isActive = isExactOrChildActive(item.path, pathname);
        const isParentActive = hasChildren && hasActiveChild(item, pathname);

        return (
          <li key={item.id}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                  isParentActive && "font-semibold text-emerald-700 dark:text-emerald-400"
                )}
              >
                <IconForItem
                  name={item.icon}
                  className={cn(
                    "text-muted-foreground",
                    isParentActive && "text-emerald-600 dark:text-emerald-400"
                  )}
                />
                <span className="flex-1 text-left">{item.libelle}</span>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ) : item.path ? (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                  isActive
                    ? "bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "text-foreground/80"
                )}
              >
                <IconForItem
                  name={item.icon}
                  className={cn(
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                />
                <span>{item.libelle}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            ) : (
              <span className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground">
                <IconForItem name={item.icon} />
                <span>{item.libelle}</span>
              </span>
            )}
            {hasChildren && isExpanded && (
              <MenuList items={item.children} level={level + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

const prefetchMap: Record<string, { queryKey: string[]; url: string }> = {
  "/dashboard": { queryKey: ["dashboard"], url: "/api/dashboard?period=30d" },
  "/marches": { queryKey: ["marches", "1", "10", "", "prefetch"], url: "/api/marches?page=1&pageSize=10" },
  "/activites": { queryKey: ["activites", "1", "10", "", "prefetch"], url: "/api/activites?page=1&pageSize=10" },
  "/tresorerie": { queryKey: ["tresorerie", "30d"], url: "/api/tresorerie?period=30d" },
};

export function DynamicMenu() {
  const queryClient = useQueryClient();

  const { data: menus } = useQuery<MenuItem[]>({
    queryKey: ["menus"],
    queryFn: async () => {
      const res = await fetch("/api/menus");
      if (!res.ok) return [];
      return (await res.json()) as MenuItem[];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: [] as MenuItem[],
  });

  const pathname = usePathname();

  const handleMouseEnter = useCallback((href: string) => {
    const config = prefetchMap[href];
    if (config) {
      queryClient.prefetchQuery({
        queryKey: config.queryKey,
        queryFn: () => fetch(config.url).then((r) => r.json()),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, [queryClient]);

  const defaultItemsUI = (
    <ul className="space-y-0.5">
      {defaultItems.map((item) => {
        const isActive = isExactOrChildActive(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                isActive
                  ? "bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-foreground/80"
              )}
              onMouseEnter={() => handleMouseEnter(item.href)}
            >
              <IconForItem
                name={item.icon}
                className={cn(
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (!menus?.length) {
    return defaultItemsUI;
  }

  return <MenuList items={menus} />;
}

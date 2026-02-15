"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const defaultItems: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/marches", label: "Marchés" },
  { href: "/marches/nouveau", label: "Nouveau marché" },
  { href: "/tresorerie", label: "Trésorerie" },
  { href: "/admin/alertes", label: "Alertes" },
];

function MenuList({ items, level = 0 }: { items: MenuItem[]; level?: number }) {
  const pathname = usePathname();

  if (!items.length) return null;

  return (
    <ul className={cn(level > 0 && "ml-3 mt-1 border-l border-border pl-2")}>
      {items.map((item) => (
        <li key={item.id}>
          {item.path ? (
            <Link
              href={item.path}
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-muted",
                pathname === item.path && "bg-muted font-medium"
              )}
            >
              {item.libelle}
            </Link>
          ) : (
            <span className="block px-3 py-2 text-sm font-medium text-muted-foreground">
              {item.libelle}
            </span>
          )}
          {item.children?.length > 0 && (
            <MenuList items={item.children} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

const prefetchMap: Record<string, { queryKey: string[]; url: string }> = {
  "/dashboard": { queryKey: ["dashboard"], url: "/api/dashboard?period=30d" },
  "/marches": { queryKey: ["marches", "1", "10", "", "prefetch"], url: "/api/marches?page=1&pageSize=10" },
  "/tresorerie": { queryKey: ["tresorerie", "30d"], url: "/api/tresorerie?period=30d" },
};

export function DynamicMenu() {
  const queryClient = useQueryClient();

  const { data: menus, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menus"],
    queryFn: async () => {
      const res = await fetch("/api/menus");
      if (!res.ok) return [];
      return (await res.json()) as MenuItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 min - menus changent rarement
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
    <ul className="space-y-1">
      {defaultItems.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            prefetch
            className={cn(
              "block rounded-md px-3 py-2 text-sm hover:bg-muted",
              pathname === item.href && "bg-muted font-medium"
            )}
            onMouseEnter={() => handleMouseEnter(item.href)}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (!menus?.length) {
    return defaultItemsUI;
  }

  return <MenuList items={menus} />;
}

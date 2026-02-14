"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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

export function DynamicMenu() {
  const { data: menus, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menus"],
    queryFn: async () => {
      const res = await fetch("/api/menus");
      if (!res.ok) return [];
      return (await res.json()) as MenuItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 min - menus changent rarement
  });

  const pathname = usePathname();

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
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (isLoading || !menus || menus.length === 0) {
    return defaultItemsUI;
  }

  return <MenuList items={menus} />;
}

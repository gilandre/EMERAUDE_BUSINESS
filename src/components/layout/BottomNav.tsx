"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Plus, Bell, Menu, RefreshCw } from "lucide-react";
import { useRefresh } from "@/hooks/useRefresh";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/marches", label: "Marchés", icon: Briefcase },
  { href: "/marches/nouveau", label: "Add", icon: Plus },
  { href: "/admin/alertes", label: "Alert", icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();
  const { refresh, loading } = useRefresh();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-background px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden safe-area-pb">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-3 py-2 transition-colors active:scale-95 ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={loading}
        className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} />
        <span className="text-xs">Actualiser</span>
      </button>
      <Link
        href="/profil/notifications"
        className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-3 py-2 transition-colors active:scale-95 ${
          pathname.startsWith("/profil") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <Menu className="h-6 w-6" />
        <span className="text-xs">Menu</span>
      </Link>
    </nav>
  );
}

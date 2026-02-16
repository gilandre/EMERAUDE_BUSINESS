"use client";

import Link from "next/link";
import { Gem } from "lucide-react";
import { DynamicMenu } from "./DynamicMenu";

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r bg-muted/30 md:block">
      <div className="flex h-full flex-col">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4 text-white transition-colors hover:from-emerald-700 hover:to-emerald-800"
          prefetch
        >
          <Gem className="h-5 w-5" />
          <span className="text-lg font-bold tracking-tight">Emeraude</span>
          <span className="text-sm font-medium text-emerald-100">Business</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <DynamicMenu />
        </nav>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { DynamicMenu } from "./DynamicMenu";

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r bg-muted/30 md:block">
      <div className="flex h-full flex-col p-4">
        <Link href="/dashboard" className="mb-6 text-lg font-semibold" prefetch>
          Emeraude Business
        </Link>
        <DynamicMenu />
      </div>
    </aside>
  );
}

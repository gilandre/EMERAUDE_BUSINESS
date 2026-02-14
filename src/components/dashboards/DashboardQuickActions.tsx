"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileText, DollarSign } from "lucide-react";

export function DashboardQuickActions() {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      <Link href="/marches/nouveau">
        <Button
          size="lg"
          className="shadow-lg rounded-full h-14 w-14 p-0 hover:scale-110 transition-transform"
          title="Nouveau marché"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
      <Link href="/marches">
        <Button
          variant="outline"
          size="sm"
          className="shadow-md rounded-full gap-2 px-4"
          title="Accompte rapide"
        >
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Accompte</span>
        </Button>
      </Link>
      <Link href="/admin/rapports">
        <Button
          variant="outline"
          size="sm"
          className="shadow-md rounded-full gap-2 px-4"
          title="Rapports"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Rapport</span>
        </Button>
      </Link>
    </div>
  );
}

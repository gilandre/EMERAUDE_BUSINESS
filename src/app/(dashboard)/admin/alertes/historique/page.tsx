"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExecutionHistorique } from "@/components/alertes/ExecutionHistorique";
import { TestAlerte } from "@/components/alertes/TestAlerte";

export default function HistoriqueAlertesPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/alertes">
          <Button variant="ghost" size="sm">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Historique des exécutions</h1>
      </div>

      <div className="mb-8">
        <TestAlerte />
      </div>

      <ExecutionHistorique />
    </div>
  );
}

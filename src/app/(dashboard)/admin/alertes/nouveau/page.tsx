"use client";

import { RegleAlerteForm } from "@/components/alertes/RegleAlerteForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NouvelleRegleAlertePage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/alertes">
          <Button variant="ghost" size="sm">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nouvelle règle d&apos;alerte</h1>
      </div>

      <RegleAlerteForm mode="create" />
    </div>
  );
}

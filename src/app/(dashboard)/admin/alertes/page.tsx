"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RegleAlerteListe } from "@/components/alertes/RegleAlerteListe";

export default function AlertesPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Règles d&apos;Alertes</h1>
        <div className="flex gap-2">
          <Link href="/admin/alertes/canaux">
            <Button variant="outline">Canaux</Button>
          </Link>
          <Link href="/admin/alertes/historique">
            <Button variant="outline">Historique</Button>
          </Link>
          <Link href="/admin/alertes/nouveau">
            <Button>+ Nouvelle Règle</Button>
          </Link>
        </div>
      </div>

      <RegleAlerteListe />
    </div>
  );
}

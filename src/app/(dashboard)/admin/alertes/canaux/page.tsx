"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfigurationCanal } from "@/components/alertes/ConfigurationCanal";

export default function CanauxAlertesPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/alertes">
          <Button variant="ghost" size="sm">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Configuration des canaux</h1>
      </div>

      <p className="mb-6 text-muted-foreground">
        Activez ou désactivez les canaux d&apos;envoi (Email, SMS, Push, Webhook). Les credentials
        se configurent via l&apos;API ou les variables d&apos;environnement.
      </p>

      <ConfigurationCanal />
    </div>
  );
}

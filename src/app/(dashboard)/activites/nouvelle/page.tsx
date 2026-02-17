"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActiviteForm } from "@/components/activites/ActiviteForm";
import { ArrowLeft } from "lucide-react";

export default function NouvelleActivitePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Nouvelle activité</h1>
        <Link href="/activites">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
      <ActiviteForm mode="create" />
    </div>
  );
}

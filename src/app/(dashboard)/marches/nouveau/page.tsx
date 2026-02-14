"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarcheForm } from "@/components/marches/MarcheForm";

export default function NouveauMarchePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">📋 Nouveau marché</h1>
        <Link href="/marches">
          <Button variant="outline">← Retour à la liste</Button>
        </Link>
      </div>
      <MarcheForm mode="create" />
    </div>
  );
}

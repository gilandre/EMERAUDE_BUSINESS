"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function OfflinePage() {
  useEffect(() => {
    const handleOnline = () => window.location.reload();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="mb-6 text-6xl">📡</div>
      <h1 className="mb-2 text-2xl font-bold">Vous êtes hors ligne</h1>
      <p className="mb-6 text-center text-muted-foreground">
        La connexion a été perdue. Les dernières données consultées peuvent être disponibles. Vérifiez votre réseau et réessayez.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Réessayer
      </Link>
    </div>
  );
}

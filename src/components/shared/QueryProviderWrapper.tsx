"use client";

import dynamic from "next/dynamic";

/** Wrapper client qui charge QueryProvider uniquement côté client (évite useEffect null en prod). */
const QueryProvider = dynamic(
  () => import("./QueryProvider").then((m) => ({ default: m.QueryProvider })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    ),
  }
);

export function QueryProviderWrapper({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

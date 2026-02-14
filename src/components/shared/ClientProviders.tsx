"use client";

import { QueryProvider } from "@/components/shared/QueryProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

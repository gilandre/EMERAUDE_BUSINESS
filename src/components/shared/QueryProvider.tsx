"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const defaultOptions = {
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 min - évite les refetch inutiles à chaque navigation
      gcTime: 10 * 60 * 1000, // 10 min (anciennement cacheTime)
    },
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(defaultOptions));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

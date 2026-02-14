"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePullToRefresh(queryKeys: string[][] = []) {
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    await Promise.all(
      queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
    );
  }, [queryClient, queryKeys]);

  return refresh;
}

"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRefresh() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/refresh", { method: "POST" });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["menus"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  return { refresh, loading };
}

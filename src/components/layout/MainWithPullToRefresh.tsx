"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PullToRefresh } from "@/components/pwa/PullToRefresh";

interface MainWithPullToRefreshProps {
  children: React.ReactNode;
}

export function MainWithPullToRefresh({ children }: MainWithPullToRefreshProps) {
  const queryClient = useQueryClient();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      fetch("/api/users/me/refresh", { method: "POST" }),
      queryClient.invalidateQueries({ queryKey: ["menus"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["marches"] }),
      queryClient.invalidateQueries({ queryKey: ["accomptes"] }),
      queryClient.invalidateQueries({ queryKey: ["decaissements"] }),
    ]);
    await queryClient.refetchQueries({ queryKey: ["menus"] });
  }, [queryClient]);

  return (
    <PullToRefresh
      onRefresh={onRefresh}
      disabled={isDesktop}
    >
      <main
        className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 md:pb-6 md:p-6 overscroll-behavior-contain"
      >
        {children}
      </main>
    </PullToRefresh>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Circle } from "lucide-react";

export function OnlineIndicator() {
  const { data, refetch } = useQuery({
    queryKey: ["presence"],
    queryFn: async () => {
      const res = await fetch("/api/presence");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 45 * 1000,
  });

  useEffect(() => {
    const sendHeartbeat = () => {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = data?.onlineCount ?? 0;
  const isOnline = data?.isCurrentUserOnline ?? false;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Circle
        className={`h-2 w-2 fill-current ${isOnline ? "text-green-500" : "text-muted-foreground"}`}
      />
      <span>{onlineCount} en ligne</span>
    </div>
  );
}

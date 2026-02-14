"use client";

import { useCallback, useState } from "react";

export function useAudit() {
  const [logs, setLogs] = useState<unknown[]>([]);

  const fetchAuditLogs = useCallback(async (filters?: Record<string, string>) => {
    const qs = filters ? "?" + new URLSearchParams(filters).toString() : "";
    const res = await fetch(`/api/audit${qs}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  }, []);

  return { logs, fetchAuditLogs };
}

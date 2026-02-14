"use client";

import { useCallback, useState } from "react";

export function useAlerts() {
  const [alerts, setAlerts] = useState<unknown[]>([]);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/alertes");
    const data = await res.json();
    setAlerts(Array.isArray(data) ? data : []);
  }, []);

  return { alerts, fetchAlerts };
}

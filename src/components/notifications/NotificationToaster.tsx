"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function NotificationToaster() {
  const previousIdsRef = useRef<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["notifications", "toast"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 45 * 1000,
  });

  useEffect(() => {
    const notifications = data?.data ?? [];
    for (const n of notifications) {
      if (!n.lu && !previousIdsRef.current.has(n.id)) {
        previousIdsRef.current.add(n.id);
        const title = n.sujet ?? n.alerte?.libelle ?? "Nouvelle alerte";
        const type = n.alerte?.code ?? "info";
        if (type === "TRESORERIE_SEUIL" || type === "TRESORERIE_FAIBLE") {
          toast.error(title, { description: n.corps?.slice(0, 100) });
        } else if (type === "DEADLINE_APPROCHANT") {
          toast.warning(title, { description: n.corps?.slice(0, 100) });
        } else if (type === "ACOMPTE_RECU") {
          toast.success(title, { description: n.corps?.slice(0, 100) });
        } else if (type === "DECAISSEMENT_VALIDE") {
          toast.success(title, { description: n.corps?.slice(0, 100) });
        } else {
          toast.info(title, { description: n.corps?.slice(0, 100) });
        }
      }
    }
  }, [data]);

  return null;
}

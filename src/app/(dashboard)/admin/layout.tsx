"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: hasAccess } = useQuery({
    queryKey: ["admin-access", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/users/me/permissions");
      if (!res.ok) return false;
      const d = await res.json();
      const perms = (d?.permissions ?? []) as string[];
      return perms.some((p) =>
        ["users:read", "profils:read", "config:read", "alertes:read", "audit:read", "monitoring:read", "*"].includes(p)
      );
    },
    enabled: !!session?.user?.id && status === "authenticated",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && hasAccess === false && hasAccess !== undefined) {
      router.push("/dashboard");
    }
  }, [status, hasAccess, router]);

  if (status === "loading" || (status === "authenticated" && hasAccess === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return <div className="admin-layout">{children}</div>;
}

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { OnlineIndicator } from "@/components/notifications/OnlineIndicator";
import { RefreshButton } from "./RefreshButton";
import { Button } from "@/components/ui/button";
import { useRefresh } from "@/hooks/useRefresh";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { data: session, status } = useSession();
  const { refresh, loading } = useRefresh();

  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <Breadcrumb />
      <div className="flex items-center gap-4">
        <OnlineIndicator />
        <RefreshButton className="shrink-0" />
        <NotificationCenter />
        {status === "loading" ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {session.user.email ?? session.user.name ?? "Compte"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="right-0">
              <DropdownMenuItem onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profil/notifications">Préférences notifications</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profil/security">Sécurité & 2FA</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/configuration">Configuration</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm">Connexion</Button>
          </Link>
        )}
      </div>
    </header>
  );
}

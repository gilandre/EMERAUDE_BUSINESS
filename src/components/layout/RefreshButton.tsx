"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRefresh } from "@/hooks/useRefresh";

interface RefreshButtonProps {
  variant?: "default" | "ghost" | "outline" | "link" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function RefreshButton({
  variant = "ghost",
  size = "icon",
  className = "",
  showLabel = false,
  label = "Actualiser",
}: RefreshButtonProps) {
  const { refresh, loading } = useRefresh();

  const handleRefresh = () => void refresh();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRefresh}
      disabled={loading}
      title={label}
    >
      <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
      {showLabel && <span className="ml-2">{label}</span>}
    </Button>
  );
}

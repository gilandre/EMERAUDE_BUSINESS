"use client";

import { useCallback, useState, useRef } from "react";

const THRESHOLD = 80;
const RESISTANCE = 2.5;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const scrollEl = document.querySelector("main.overflow-auto");
      const scrollTop = scrollEl?.scrollTop ?? window.scrollY ?? 0;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const scrollEl = document.querySelector("main.overflow-auto");
      const scrollTop = scrollEl?.scrollTop ?? window.scrollY ?? 0;
      if (scrollTop > 0) return;

      const y = e.touches[0].clientY;
      const diff = y - startY.current;
      if (diff > 0) {
        const distance = Math.min(diff / RESISTANCE, THRESHOLD * 1.5);
        setPullDistance(distance);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="absolute left-0 right-0 top-0 flex justify-center pt-4 transition-opacity"
          style={{
            transform: `translateY(${-100 + pullDistance}px)`,
            opacity: Math.min(1, pullDistance / THRESHOLD),
          }}
        >
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {pullDistance >= THRESHOLD ? (
              <>
                <span className="text-sm font-medium">Relâchez pour actualiser</span>
              </>
            ) : (
              <>
                <span className="text-sm">Tirez pour actualiser</span>
              </>
            )}
            <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (pullDistance / THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {children}
    </div>
  );
}

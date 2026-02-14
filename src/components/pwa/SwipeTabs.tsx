"use client";

import { useCallback, useRef, useState } from "react";

const SWIPE_THRESHOLD = 50;

interface SwipeTabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  children?: React.ReactNode;
}

export function SwipeTabs({
  tabs,
  activeIndex,
  onTabChange,
}: SwipeTabsProps) {
  const startX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX.current - endX;

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0 && activeIndex < tabs.length - 1) {
          onTabChange(activeIndex + 1);
        } else if (diff < 0 && activeIndex > 0) {
          onTabChange(activeIndex - 1);
        }
      }
    },
    [activeIndex, tabs.length, onTabChange]
  );

  return (
    <div
      className="touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {tabs[activeIndex]?.content}
    </div>
  );
}

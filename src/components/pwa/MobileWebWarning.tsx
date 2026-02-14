"use client";

import { useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";

function isMobileUserAgent(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768)
  );
}

export function MobileWebWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileUserAgent());
    const stored = sessionStorage.getItem("mobile-web-warning-dismissed");
    if (stored === "true") setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("mobile-web-warning-dismissed", "true");
  };

  if (!isMobile || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 border-b bg-amber-50 p-4 shadow-sm sm:hidden"
      role="alert"
    >
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900">
                Expérience dégradée sur navigateur mobile
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Pour une meilleure expérience, utilisez l&apos;application mobile native Android.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
  );
}

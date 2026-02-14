"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-install-dismissed");
    if (stored) return;

    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isMobile) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    if (isIOSDevice) {
      setShowBanner(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowBanner(false);
      setDeferredPrompt(null);
    }
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 border-t bg-slate-900 p-4 text-white shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-lg safe-area-pb">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold">Installer Emeraude Business</h3>
          <p className="mt-0.5 text-sm text-slate-300">
            {isIOS
              ? "Appuyez sur Partager puis \"Sur l'écran d'accueil\" pour installer."
              : "Installez l'application pour un accès rapide et hors ligne."}
          </p>
          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              className="mt-2"
              onClick={handleInstall}
            >
              <Download className="mr-2 h-4 w-4" />
              Installer
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

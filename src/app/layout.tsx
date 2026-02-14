import type { Metadata, Viewport } from "next";
import "@/app/styles/globals.css";
import { ClientProviders } from "@/components/shared/ClientProviders";

/** Évite la pré-rendu statique (conflit React Query / useEffect lors du build). */
export const dynamic = "force-dynamic";

const APP_NAME = "Emeraude Business";
const APP_DESCRIPTION = "Application de gestion de marchés BTP";

export const metadata: Metadata = {
  applicationName: "Gestion Marchés",
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marchés",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon-192x192.png", sizes: "192x192" }, { url: "/icon-512x512.png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Marchés",
  },
};

export const viewport: Viewport = {
  themeColor: "#0066cc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

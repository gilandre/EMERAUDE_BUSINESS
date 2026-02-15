import { SessionProvider } from "@/components/shared/SessionProvider";
import { SonnerToaster } from "@/components/shared/SonnerToaster";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { MainWithPullToRefresh } from "@/components/layout/MainWithPullToRefresh";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { MobileWebWarning } from "@/components/pwa/MobileWebWarning";
import { NotificationToaster } from "@/components/notifications/NotificationToaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SonnerToaster />
      <NotificationToaster />
      <OfflineBanner />
      <MobileWebWarning />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <Header />
          <MainWithPullToRefresh>{children}</MainWithPullToRefresh>
        </div>
      </div>
      <BottomNav />
      <InstallPrompt />
    </SessionProvider>
  );
}

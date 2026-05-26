import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Pass true to suppress horizontal padding (e.g. full-bleed entry screens) */
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding = false }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          isMobile ? "ml-0" : "md:ml-64"
        }`}
      >
        <Header />
        <main
          className={
            noPadding
              ? isMobile ? "mobile-page-content" : ""
              : `p-3 sm:p-4 md:p-6 ${isMobile ? "mobile-page-content" : ""}`
          }
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — hidden on desktop */}
      {isMobile && <BottomNav />}
    </div>
  );
}

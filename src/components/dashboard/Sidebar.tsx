import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Target,
  CreditCard,
  Receipt,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Activity, label: "Activities", path: "/activities" },
  { icon: Building2, label: "Services", path: "/services" },
  { icon: CreditCard, label: "Debts", path: "/madeni" },
  { icon: Target, label: "Goals", path: "/goals" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const advancedItems = [
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Lightbulb, label: "Insights", path: "/insights" },
  { icon: TrendingUp, label: "Projections", path: "/projections" },
];

function SidebarContent({ collapsed, onCollapse, onNavigate }: { 
  collapsed: boolean; 
  onCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="font-bold text-foreground">Meilleur</h1>
              <p className="text-xs text-muted-foreground">Group Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto">
            <span className="text-primary font-bold text-lg">M</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "nav-item",
                isActive && "nav-item-active",
                collapsed && "justify-center px-3"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Advanced Features Section */}
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Advanced
            </p>
          )}
          {advancedItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "nav-item",
                  isActive && "nav-item-active",
                  collapsed && "justify-center px-3"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Collapse Button - only on desktop */}
      {onCollapse && (
        <div className="p-4 border-t border-sidebar-border hidden md:block">
          <button
            onClick={onCollapse}
            className="nav-item w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 md:hidden bg-background/80 backdrop-blur-sm"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar">
          <div className="h-full flex flex-col">
            <SidebarContent 
              collapsed={false} 
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 flex flex-col hidden md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent 
        collapsed={collapsed} 
        onCollapse={() => setCollapsed(!collapsed)}
      />
    </aside>
  );
}

export function useSidebarWidth() {
  const isMobile = useIsMobile();
  const [collapsed] = useState(false);
  
  if (isMobile) return "0";
  return collapsed ? "5rem" : "16rem";
}

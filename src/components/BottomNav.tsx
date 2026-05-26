import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2,
  DollarSign,
  Target,
  CreditCard,
  Receipt,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Activity,
} from "lucide-react";

// The 4 primary tabs
const PRIMARY_TABS = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    exact: true,
  },
  {
    icon: FileText,
    label: "Reports",
    path: "/reports",
    exact: false,
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
    exact: false,
  },
];

// Secondary routes accessible via the More sheet
const MORE_ITEMS = [
  {
    section: "Business",
    items: [
      { icon: Building2,  label: "Services",    path: "/services" },
      { icon: DollarSign, label: "Revenue",     path: "/revenue" },
      { icon: CreditCard, label: "Debts",       path: "/debts" },
      { icon: Receipt,    label: "Expenses",    path: "/expenses" },
      { icon: Target,     label: "Goals",       path: "/goals" },
      { icon: Activity,   label: "Activities",  path: "/activities" },
    ],
  },
  {
    section: "Advanced",
    items: [
      { icon: BarChart3,  label: "Analytics",   path: "/analytics" },
      { icon: Lightbulb,  label: "Insights",    path: "/insights" },
      { icon: TrendingUp, label: "Projections", path: "/projections" },
    ],
  },
];

// Active-check for tabs — Dashboard is exact, others are prefix
function useIsTabActive(path: string, exact: boolean) {
  const location = useLocation();
  if (exact) return location.pathname === path;
  return location.pathname.startsWith(path);
}

function TabItem({
  icon: Icon,
  label,
  path,
  exact,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  exact: boolean;
}) {
  const isActive = useIsTabActive(path, exact);

  return (
    <NavLink
      to={path}
      end={exact}
      className={cn("bottom-nav-item", isActive && "active")}
    >
      <div className="bottom-nav-indicator">
        <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.6} />
      </div>
      <span>{label}</span>
    </NavLink>
  );
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if any secondary route is currently active
  const secondaryPaths = MORE_ITEMS.flatMap(s => s.items.map(i => i.path));
  const isMoreActive = secondaryPaths.some(p => location.pathname.startsWith(p));

  function handleMoreNavigate(path: string) {
    setMoreOpen(false);
    navigate(path);
  }

  return (
    <>
      <nav className="bottom-nav">
        {/* Dashboard */}
        <TabItem {...PRIMARY_TABS[0]} />

        {/* Entry — centrepiece "+" button */}
        <NavLink
          to="/entry"
          className={({ isActive }) =>
            cn("bottom-nav-item", isActive && "active", "relative")
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-primary shadow-[0_4px_14px_hsl(229_92%_63%/0.45)] scale-105"
                    : "bg-primary/90 shadow-[0_3px_10px_hsl(229_92%_63%/0.35)]"
                )}
                style={{ marginTop: "-14px" }}
              >
                <Plus
                  className="w-6 h-6 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <span className={cn(isActive ? "text-primary" : "")}>Entry</span>
            </>
          )}
        </NavLink>

        {/* Reports */}
        <TabItem {...PRIMARY_TABS[1]} />

        {/* More — opens secondary routes sheet */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn("bottom-nav-item", isMoreActive && "active")}
          aria-label="More navigation options"
        >
          <div className="bottom-nav-indicator">
            {/* 3-dot grid icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth={isMoreActive ? 2.2 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5"  cy="5"  r="1.5" />
              <circle cx="11" cy="5"  r="1.5" />
              <circle cx="17" cy="5"  r="1.5" />
              <circle cx="5"  cy="11" r="1.5" />
              <circle cx="11" cy="11" r="1.5" />
              <circle cx="17" cy="11" r="1.5" />
              <circle cx="5"  cy="17" r="1.5" />
              <circle cx="11" cy="17" r="1.5" />
              <circle cx="17" cy="17" r="1.5" />
            </svg>
          </div>
          <span>More</span>
        </button>

        {/* Settings */}
        <TabItem {...PRIMARY_TABS[2]} />
      </nav>

      {/* More Sheet — secondary routes */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-0 bg-background/95 backdrop-blur-2xl border-t border-border/60"
          style={{ maxHeight: "72vh" }}
        >
          <div className="w-10 h-1 bg-border/60 rounded-full mx-auto mt-3 mb-1" />

          <SheetHeader className="px-6 pt-2 pb-3 border-b border-border/40">
            <SheetTitle className="text-base font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              More
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-5">
            {MORE_ITEMS.map((section) => (
              <div key={section.section}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {section.section}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleMoreNavigate(item.path)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl text-center transition-all duration-150 active:scale-95",
                          isActive
                            ? "bg-primary/12 text-primary border border-primary/20"
                            : "bg-muted/60 text-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon
                          className="w-5 h-5"
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Building2, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Activity, label: "Activity", path: "/activities" },
  { icon: Building2, label: "Services", path: "/services" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {bottomNavItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn("bottom-nav-item", isActive && "active")}
          >
            <item.icon
              className="w-[22px] h-[22px]"
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

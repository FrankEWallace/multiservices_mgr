import { Search, Calendar, Sun, Moon, LogOut, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const services = [
  "All Services",
  "Transport",
  "Logistics",
  "Real Estate",
  "Agriculture",
  "Retail",
  "Construction",
];

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

export function Header() {
  const [selectedService, setSelectedService] = useState("All Services");
  const [selectedRange, setSelectedRange] = useState("month");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  // Get user initials
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  // Mobile filters sheet content
  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Service</label>
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue placeholder="Select Service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Range</label>
        <Select value={selectedRange} onValueChange={setSelectedRange}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {dateRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-full pl-10 bg-secondary border-border"
          />
        </div>
      </div>
    </div>
  );

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6"
      style={{
        height: isMobile ? "56px" : "64px",
        background: "hsl(var(--card) / 0.8)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        backdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      {/* Left — title + desktop filters */}
      <div className="flex items-center gap-4">
        {/* Mobile spacer for sidebar sheet trigger */}
        {isMobile && <div className="w-8" />}

        <div>
          <h2
            className="text-foreground leading-none"
            style={{
              fontSize: isMobile ? "1rem" : "1.125rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
            }}
          >
            {isMobile ? "Dashboard" : "Executive Dashboard"}
          </h2>
          {!isMobile && (
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem", letterSpacing: "0.04em", fontWeight: 500 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          )}
        </div>

        {/* Desktop filters — pill style */}
        {!isMobile && (
          <div className="hidden lg:flex items-center gap-2 ml-2">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger
                className="h-8 text-xs font-medium border-border bg-secondary/70 rounded-full px-4 gap-1.5 focus:ring-0"
                style={{ minWidth: "140px" }}
              >
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger
                className="h-8 text-xs font-medium border-border bg-secondary/70 rounded-full px-4 gap-1.5 focus:ring-0"
                style={{ minWidth: "120px" }}
              >
                <Calendar className="w-3.5 h-3.5" />
                <SelectValue placeholder="This Month" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Mobile filters sheet */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base font-semibold" style={{ letterSpacing: "-0.02em" }}>
                  Filters
                </SheetTitle>
              </SheetHeader>
              <div className="pb-6">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop search */}
        {!isMobile && (
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              className="h-8 w-48 lg:w-56 pl-9 pr-3 text-xs rounded-full bg-secondary/70 border-border focus-visible:ring-1"
            />
          </div>
        )}

        {/* Theme toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Avatar / User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 ml-1 pl-3 border-l border-border/60 focus:outline-none"
              style={{ touchAction: "manipulation" }}
            >
              <div
                className="flex items-center justify-center rounded-full bg-primary/15 text-primary font-semibold select-none"
                style={{
                  width: isMobile ? "32px" : "34px",
                  height: isMobile ? "32px" : "34px",
                  fontSize: "0.75rem",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 0 0 2px hsl(var(--primary)/0.2)",
                }}
              >
                {initials}
              </div>
              {!isMobile && (
                <div className="hidden sm:block text-left">
                  <p
                    className="text-foreground"
                    style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}
                  >
                    {user?.fullName?.split(" ")[0] || user?.username}
                  </p>
                  <p
                    className="text-muted-foreground"
                    style={{ fontSize: "0.68rem", letterSpacing: "0.01em", lineHeight: 1.2 }}
                  >
                    {user?.isAdmin ? "Administrator" : "Member"}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
            <DropdownMenuLabel className="px-2 py-2">
              <p className="font-semibold text-foreground" style={{ fontSize: "0.85rem", letterSpacing: "-0.02em" }}>
                {user?.fullName || user?.username}
              </p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="cursor-pointer rounded-lg text-sm">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg text-sm">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

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
    <header className="h-14 md:h-16 bg-card/50 backdrop-blur-xl border-b border-border px-3 md:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left side */}
      <div className="flex items-center gap-2 md:gap-6">
        {/* Spacer for mobile menu button */}
        {isMobile && <div className="w-10" />}
        
        <h2 className="text-base md:text-xl font-semibold text-foreground truncate">
          {isMobile ? "Dashboard" : "Executive Dashboard"}
        </h2>
        
        {/* Desktop filters */}
        {!isMobile && (
          <div className="hidden lg:flex items-center gap-3">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-44 bg-secondary border-border">
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

            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-36 bg-secondary border-border">
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
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile filters button */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Filter className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop search */}
        {!isMobile && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-48 lg:w-64 pl-10 bg-secondary border-border"
            />
          </div>
        )}
        
        {/* Theme toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-lg"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        {/* Notifications */}
        <NotificationCenter />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 md:pl-4 md:border-l border-border hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold text-xs md:text-sm">
                  {initials}
                </span>
              </div>
              {/* Hide user info on mobile */}
              {!isMobile && (
                <div className="text-sm text-left hidden sm:block">
                  <p className="font-medium text-foreground">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.isAdmin ? "Admin" : "User"}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div>
                <p>{user?.fullName || user?.username}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-danger focus:text-danger"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

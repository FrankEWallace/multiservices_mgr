import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { DateRangePicker, DateRange, getDefaultDateRange } from "@/components/dashboard/DateRangePicker";
import { DrillDownDialog } from "@/components/dashboard/DrillDownDialog";
import { dashboardApi, servicesApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/hooks/use-number-format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Target,
  Receipt,
} from "lucide-react";

const Index = () => {
  const queryClient = useQueryClient();
  const { formatCurrency } = useNumberFormat();
  
  // State for dashboard controls
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drillDownType, setDrillDownType] = useState<"revenue" | "profit" | "expenses" | "debt" | "service" | null>(null);

  // Fetch services list for filter
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
    staleTime: 300000, // 5 minutes
  });

  // Queries with filter parameters
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["dashboard", "kpis", selectedServiceId, dateRange.from, dateRange.to],
    queryFn: () => dashboardApi.getKPIs({
      serviceId: selectedServiceId !== "all" ? Number(selectedServiceId) : undefined,
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to.toISOString().split('T')[0],
    }),
    staleTime: 30000,
  });

  // Filter out Debt related KPIs and limit to 3, then format with user preference
  const filteredKPIs = kpiData?.kpis
    .filter(kpi => !kpi.title.toLowerCase().includes("debt"))
    .slice(0, 3)
    .map(kpi => ({
      ...kpi,
      formattedValue: formatCurrency(kpi.value),
    })) || [];

  // Refresh all dashboard data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        refetchKPIs(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetchKPIs]);

  // Icon mapping
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "dollar-sign": return <DollarSign className="w-5 h-5" />;
      case "trending-up": return <TrendingUp className="w-5 h-5" />;
      case "target": return <Target className="w-5 h-5" />;
      default: return <Receipt className="w-5 h-5" />;
    }
  };

  // Handle KPI click for drill-down
  const handleKPIClick = (kpiTitle: string) => {
    switch (kpiTitle) {
      case "Total Revenue":
        setDrillDownType("revenue");
        break;
      case "Total Profit":
        setDrillDownType("profit");
        break;
      case "Outstanding Debt":
        setDrillDownType("debt");
        break;
      default:
        break;
    }
  };

  return (
    <DashboardLayout>
      {/* Drill-down dialog */}
      <DrillDownDialog
        open={drillDownType !== null}
        onOpenChange={(open) => !open && setDrillDownType(null)}
        type={drillDownType}
        dateRange={dateRange}
      />

      <div className="space-y-5">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="text-foreground font-bold leading-tight"
              style={{ fontSize: "1.6rem", letterSpacing: "-0.03em" }}
            >
              Overview
            </h1>
            <p
              className="text-muted-foreground mt-0.5"
              style={{ fontSize: "0.8rem", letterSpacing: "0.01em" }}
            >
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </p>
          </div>

          {/* Controls — compact pill row */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DateRangePicker value={dateRange} onChange={setDateRange} />

            {/* Service filter pill */}
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger
                className="h-8 rounded-full text-xs font-medium border-border bg-secondary/70 px-3 gap-1 focus:ring-0"
                style={{ minWidth: 110 }}
              >
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {servicesData?.services?.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh icon button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary/70 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90 touch-manipulation disabled:opacity-40"
              style={{ flexShrink: 0 }}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* ── KPI strip — 3 cards in one row ──────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {kpiLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </>
          ) : (
            filteredKPIs.map((kpi, index) => (
              <div
                key={kpi.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={() => handleKPIClick(kpi.title)}
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.formattedValue}
                  change={kpi.change}
                  icon={getIcon(kpi.icon)}
                  variant={kpi.variant}
                  compact
                />
              </div>
            ))
          )}
        </div>

        {/* ── Charts ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueChart
            serviceId={selectedServiceId !== "all" ? Number(selectedServiceId) : undefined}
            startDate={dateRange.from.toISOString().split("T")[0]}
            endDate={dateRange.to.toISOString().split("T")[0]}
          />
          <ServiceComparison
            startDate={dateRange.from.toISOString().split("T")[0]}
            endDate={dateRange.to.toISOString().split("T")[0]}
          />
        </div>

        {/* ── Goals ───────────────────────────────────────────────── */}
        <GoalProgress
          serviceId={selectedServiceId !== "all" ? Number(selectedServiceId) : undefined}
        />
      </div>
    </DashboardLayout>
  );
};

export default Index;

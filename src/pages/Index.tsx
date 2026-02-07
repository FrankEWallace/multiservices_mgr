import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { RefreshControl } from "@/components/dashboard/RefreshControl";
import { DateRangePicker, DateRange, getDefaultDateRange } from "@/components/dashboard/DateRangePicker";
import { DrillDownDialog } from "@/components/dashboard/DrillDownDialog";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/hooks/use-number-format";
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
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drillDownType, setDrillDownType] = useState<"revenue" | "profit" | "expenses" | "debt" | "service" | null>(null);

  // Queries
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: dashboardApi.getKPIs,
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
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetchKPIs]);

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval === 0) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval, handleRefresh]);

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

      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Business overview at a glance</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <RefreshControl
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              lastUpdated={lastUpdated}
            />
          </div>
        </div>

        {/* KPI Cards - 3 cards: Revenue, Profit, Daily Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpiLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </>
          ) : (
            filteredKPIs.map((kpi, index) => (
              <div
                key={kpi.title}
                style={{ animationDelay: `${index * 100}ms` }}
                className="animate-fade-in cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => handleKPIClick(kpi.title)}
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.formattedValue}
                  change={kpi.change}
                  icon={getIcon(kpi.icon)}
                  variant={kpi.variant}
                />
              </div>
            ))
          )}
        </div>

        {/* Charts Row - Revenue Trend + Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <ServiceComparison />
        </div>

        {/* Goal Progress - Full width */}
        <GoalProgress />
      </div>
    </DashboardLayout>
  );
};

export default Index;

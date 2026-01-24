import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { QuickInsights } from "@/components/dashboard/QuickInsights";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { MadeniSummary } from "@/components/dashboard/MadeniSummary";
import { DateRangePicker, DateRange, getDefaultDateRange } from "@/components/dashboard/DateRangePicker";
import { RefreshControl } from "@/components/dashboard/RefreshControl";
import { ComparisonView } from "@/components/dashboard/ComparisonView";
import { DrillDownDialog } from "@/components/dashboard/DrillDownDialog";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  Target,
  CreditCard,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "dollar-sign": <DollarSign className="w-5 h-5" />,
  "trending-up": <TrendingUp className="w-5 h-5" />,
  "target": <Target className="w-5 h-5" />,
  "credit-card": <CreditCard className="w-5 h-5" />,
};

const Index = () => {
  const queryClient = useQueryClient();
  
  // State for dashboard controls
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshInterval, setRefreshInterval] = useState(0); // 0 = disabled
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [comparisonPeriod, setComparisonPeriod] = useState<"mom" | "yoy" | "wow">("mom");
  const [drillDownType, setDrillDownType] = useState<"revenue" | "profit" | "expenses" | "debt" | "service" | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: dashboardApi.getKPIs,
    staleTime: 30000,
  });

  const { data: comparisonData, isLoading: comparisonLoading, refetch: refetchComparison } = useQuery({
    queryKey: ["dashboard", "comparison", comparisonPeriod],
    queryFn: () => dashboardApi.getComparison(comparisonPeriod),
    staleTime: 60000,
  });

  // Refresh all dashboard data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        refetchKPIs(),
        refetchComparison(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetchKPIs, refetchComparison]);

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval === 0) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval, handleRefresh]);

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
        {/* Dashboard Header with Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Business performance overview</p>
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

        {/* KPI Cards - Clickable for drill-down */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </>
          ) : (
            kpiData?.kpis.map((kpi, index) => (
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
                  icon={iconMap[kpi.icon] || <DollarSign className="w-5 h-5" />}
                  variant={kpi.variant}
                />
              </div>
            ))
          )}
        </div>

        {/* Comparison View - YoY, MoM, WoW */}
        <ComparisonView
          data={comparisonData?.comparison}
          isLoading={comparisonLoading}
          period={comparisonPeriod}
          onPeriodChange={setComparisonPeriod}
          title="Performance Comparison"
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <ServiceComparison />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GoalProgress />
          <MadeniSummary />
          <QuickInsights />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;

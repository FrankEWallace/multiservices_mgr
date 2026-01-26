import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { RefreshControl } from "@/components/dashboard/RefreshControl";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  Target,
  Receipt,
} from "lucide-react";

const Index = () => {
  const queryClient = useQueryClient();
  
  // State for dashboard controls
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: dashboardApi.getKPIs,
    staleTime: 30000,
  });

  // Filter out Debt related KPIs and limit to 3
  const filteredKPIs = kpiData?.kpis
    .filter(kpi => !kpi.title.toLowerCase().includes("debt"))
    .slice(0, 3) || [];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Business overview at a glance</p>
          </div>
          <RefreshControl
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            interval={refreshInterval}
            onIntervalChange={setRefreshInterval}
            lastUpdated={lastUpdated}
          />
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
                className="animate-fade-in"
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

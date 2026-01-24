import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { QuickInsights } from "@/components/dashboard/QuickInsights";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { MadeniSummary } from "@/components/dashboard/MadeniSummary";
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
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: dashboardApi.getKPIs,
    staleTime: 30000, // 30 seconds
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
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
                className="animate-fade-in"
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

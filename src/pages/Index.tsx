import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceComparison } from "@/components/dashboard/ServiceComparison";
import { QuickInsights } from "@/components/dashboard/QuickInsights";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { MadeniSummary } from "@/components/dashboard/MadeniSummary";
import {
  DollarSign,
  TrendingUp,
  Target,
  CreditCard,
  Wallet,
} from "lucide-react";

const kpiData = [
  {
    title: "Total Revenue",
    value: "$84,254",
    change: 12.5,
    icon: <DollarSign className="w-5 h-5" />,
    variant: "success" as const,
  },
  {
    title: "Total Profit",
    value: "$28,420",
    change: 8.2,
    icon: <TrendingUp className="w-5 h-5" />,
    variant: "success" as const,
  },
  {
    title: "Daily Goal",
    value: "87%",
    change: -3.4,
    icon: <Target className="w-5 h-5" />,
    variant: "warning" as const,
  },
  {
    title: "Outstanding Madeni",
    value: "$39,100",
    change: -5.8,
    icon: <CreditCard className="w-5 h-5" />,
    variant: "danger" as const,
  },
  {
    title: "Cash Collected",
    value: "$12,840",
    change: 15.3,
    icon: <Wallet className="w-5 h-5" />,
    variant: "success" as const,
  },
];

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiData.map((kpi, index) => (
            <div
              key={kpi.title}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <KPICard
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                icon={kpi.icon}
                variant={kpi.variant}
              />
            </div>
          ))}
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

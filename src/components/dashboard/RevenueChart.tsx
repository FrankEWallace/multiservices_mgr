import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "revenue-chart"],
    queryFn: () => dashboardApi.getRevenueChart(),
    staleTime: 60000, // 1 minute
  });

  // Transform data for chart
  const chartData =
    data?.chartData.map((item) => ({
      name: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
      }),
      revenue: item.revenue,
      profit: item.profit,
    })) || [];

  return (
    <div className="chart-container h-80">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Revenue Trend</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span className="text-sm text-muted-foreground">Profit</span>
          </div>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="w-full h-[85%]" />
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(160, 84%, 39%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(160, 84%, 39%)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(199, 89%, 48%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(199, 89%, 48%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProfit)"
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

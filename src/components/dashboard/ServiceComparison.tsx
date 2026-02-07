import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/hooks/use-number-format";

const COLORS = [
  "hsl(160, 84%, 39%)", // green
  "hsl(217, 91%, 60%)", // blue
  "hsl(38, 92%, 50%)",  // amber
  "hsl(280, 65%, 60%)", // purple
  "hsl(0, 84%, 60%)",   // red
  "hsl(180, 70%, 45%)", // teal
];

const CustomTooltip = ({ active, payload }: any) => {
  const { formatCurrency } = useNumberFormat();
  
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="glass-card p-3 border border-border">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-primary">{formatCurrency(data.value)}</p>
        <p className="text-xs text-muted-foreground">{data.payload.percentage}% of total</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ServiceComparison() {
  const { formatCurrency } = useNumberFormat();
  
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "service-comparison"],
    queryFn: dashboardApi.getServiceComparison,
    staleTime: 60000,
  });

  const totalRevenue = data?.comparison.reduce((sum, item) => sum + item.actual, 0) || 0;

  const chartData = data?.comparison.map((item) => ({
    name: item.name,
    value: item.actual,
    percentage: totalRevenue > 0 ? ((item.actual / totalRevenue) * 100).toFixed(1) : "0",
  })) || [];

  return (
    <div className="chart-container h-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Revenue by Service</h3>
        <span className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalRevenue)}
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="w-full h-[85%]" />
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[85%] text-muted-foreground">
          No revenue data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={0}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

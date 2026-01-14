import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  Building2,
} from "lucide-react";

const revenueData = [
  { name: "Week 1", revenue: 12500 },
  { name: "Week 2", revenue: 15200 },
  { name: "Week 3", revenue: 13800 },
  { name: "Week 4", revenue: 17400 },
];

const costBreakdown = [
  { name: "Fixed Costs", value: 8500, color: "hsl(199, 89%, 48%)" },
  { name: "Variable Costs", value: 5200, color: "hsl(38, 92%, 50%)" },
  { name: "Operating Expenses", value: 3100, color: "hsl(280, 65%, 60%)" },
];

const services = [
  { name: "Transport", revenue: 28500, profit: 8200, margin: 28.8, goalMet: true },
  { name: "Logistics", revenue: 22300, profit: 5800, margin: 26.0, goalMet: false },
  { name: "Real Estate", revenue: 18700, profit: 6200, margin: 33.2, goalMet: true },
  { name: "Agriculture", revenue: 15200, profit: 3900, margin: 25.7, goalMet: false },
  { name: "Retail", revenue: 12800, profit: 2900, margin: 22.7, goalMet: true },
  { name: "Construction", revenue: 9400, profit: 1800, margin: 19.1, goalMet: false },
];

const Services = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Performance</h1>
            <p className="text-muted-foreground">Monitor individual service metrics and KPIs</p>
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.name} className="glass-card p-6 hover:bg-card-hover transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{service.name}</h3>
                </div>
                <span className={service.goalMet ? "badge-success" : "badge-warning"}>
                  {service.goalMet ? "On Track" : "Below Target"}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Revenue</p>
                  <p className="text-lg font-bold text-foreground">${(service.revenue / 1000).toFixed(1)}k</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Profit</p>
                  <p className="text-lg font-bold text-success">${(service.profit / 1000).toFixed(1)}k</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Margin</p>
                  <p className="text-lg font-bold text-foreground">{service.margin}%</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="progress-bar">
                  <div
                    className={`h-full rounded-full ${service.goalMet ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${Math.min((service.revenue / 30000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorServiceRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
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
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorServiceRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Breakdown */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Cost Breakdown</h3>
            <div className="flex items-center justify-center h-[85%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 9%)",
                      border: "1px solid hsl(222, 47%, 16%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col gap-2">
                {costBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Services;

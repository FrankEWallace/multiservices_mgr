import { useQuery } from "@tanstack/react-query";
import { servicesApi, ServiceWithStats } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Truck,
  Package,
  Home,
  Wheat,
  ShoppingCart,
  Hammer,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
} from "lucide-react";

interface ServiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithStats | null;
}

const iconMap: Record<string, React.ReactNode> = {
  truck: <Truck className="w-6 h-6 text-primary" />,
  package: <Package className="w-6 h-6 text-primary" />,
  building: <Home className="w-6 h-6 text-primary" />,
  wheat: <Wheat className="w-6 h-6 text-primary" />,
  "shopping-cart": <ShoppingCart className="w-6 h-6 text-primary" />,
  hammer: <Hammer className="w-6 h-6 text-primary" />,
};

export function ServiceDetailDialog({
  open,
  onOpenChange,
  service,
}: ServiceDetailDialogProps) {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["services", service?.id, "stats"],
    queryFn: () => (service ? servicesApi.getStats(service.id) : null),
    enabled: open && !!service,
    staleTime: 30000,
  });

  const stats = statsData?.stats;

  if (!service) return null;

  const progressPercent = service.monthlyTarget
    ? Math.min(100, (service.revenue / service.monthlyTarget) * 100)
    : 0;

  // Generate mock monthly data for the chart (would come from API in production)
  const monthlyData = [
    { month: "Jan", revenue: Math.round(service.revenue * 0.7), profit: Math.round(service.profit * 0.6) },
    { month: "Feb", revenue: Math.round(service.revenue * 0.75), profit: Math.round(service.profit * 0.65) },
    { month: "Mar", revenue: Math.round(service.revenue * 0.85), profit: Math.round(service.profit * 0.75) },
    { month: "Apr", revenue: Math.round(service.revenue * 0.9), profit: Math.round(service.profit * 0.85) },
    { month: "May", revenue: Math.round(service.revenue * 0.95), profit: Math.round(service.profit * 0.9) },
    { month: "Jun", revenue: service.revenue, profit: service.profit },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              {iconMap[service.icon] || (
                <Building2 className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">{service.name}</DialogTitle>
              <DialogDescription>
                {service.description || "Service performance overview"}
              </DialogDescription>
            </div>
            <Badge
              variant={service.isActive ? "default" : "secondary"}
              className="ml-auto"
            >
              {service.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Revenue</span>
              </div>
              <p className="text-xl font-bold">
                ${service.revenue.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs">Profit</span>
              </div>
              <p className="text-xl font-bold text-success">
                ${service.profit.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs">Margin</span>
              </div>
              <p className="text-xl font-bold">{service.margin}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Target Progress</span>
              </div>
              <p className="text-xl font-bold">
                {progressPercent.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Monthly Target Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Monthly Target: ${service.monthlyTarget?.toLocaleString() || 0}
              </span>
              <Badge variant={service.goalMet ? "default" : "secondary"}>
                {service.goalMet ? "On Track" : "Below Target"}
              </Badge>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  service.goalMet ? "bg-success" : "bg-warning"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Revenue Trend Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Revenue Trend (6 Months)</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Targets Section */}
          <div>
            <h4 className="text-sm font-medium mb-3">Target Breakdown</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Daily Target</p>
                <p className="text-lg font-semibold">
                  ${service.dailyTarget?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Monthly Target</p>
                <p className="text-lg font-semibold">
                  ${service.monthlyTarget?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Yearly Target</p>
                <p className="text-lg font-semibold">
                  ${service.yearlyTarget?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Stats from API */}
          {statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20" />
            </div>
          ) : stats ? (
            <div>
              <h4 className="text-sm font-medium mb-3">Period Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  <p className="font-semibold">
                    ${stats.monthlyRevenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                  <p className="font-semibold">
                    ${stats.monthlyExpenses?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Monthly Profit</p>
                  <p className="font-semibold text-success">
                    ${stats.monthlyProfit?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Yearly Revenue</p>
                  <p className="font-semibold">${stats.yearlyRevenue?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

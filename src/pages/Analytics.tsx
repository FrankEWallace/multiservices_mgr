import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  BarChart3,
  LineChart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { analyticsApi, ProfitMargin, ProfitabilityRanking, CashFlowData, Anomaly } from "@/lib/api";

const PERIOD_OPTIONS = [
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

// Profit Margins Tab
function ProfitMarginsTab({ period }: { period: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "profit-margins", period],
    queryFn: () => analyticsApi.getProfitMargins(period),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load profit margin data</AlertDescription>
      </Alert>
    );
  }

  const margins = data?.margins || [];
  const overall = data?.overall;

  const chartData = margins.map((m) => ({
    name: m.serviceName,
    revenue: m.totalRevenue,
    expenses: m.totalExpenses,
    profit: m.grossProfit,
    margin: m.profitMargin,
    color: m.serviceColor,
  }));

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      {overall && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(overall.totalRevenue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Expenses</CardDescription>
              <CardTitle className="text-2xl text-red-600">{formatCurrency(overall.totalExpenses)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gross Profit</CardDescription>
              <CardTitle className="text-2xl text-green-600">{formatCurrency(overall.grossProfit)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overall Margin</CardDescription>
              <CardTitle className="text-2xl">{overall.overallMargin.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Margins by Service</CardTitle>
          <CardDescription>Revenue, expenses, and profit margin breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "margin" ? `${value.toFixed(1)}%` : formatCurrency(value),
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service-Level Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {margins.map((margin) => (
              <div key={margin.serviceId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: margin.serviceColor }}
                  />
                  <div>
                    <p className="font-medium">{margin.serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      {margin.revenueCount} revenues · {margin.expenseCount} expenses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="font-medium text-green-600">{formatCurrency(margin.totalRevenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Expenses</p>
                    <p className="font-medium text-red-600">{formatCurrency(margin.totalExpenses)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-medium text-blue-600">{formatCurrency(margin.grossProfit)}</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <Badge variant={margin.profitMargin >= 20 ? "default" : margin.profitMargin >= 0 ? "secondary" : "destructive"}>
                      {margin.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Profitability Ranking Tab
function ProfitabilityRankingTab({ period }: { period: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "profitability-ranking", period],
    queryFn: () => analyticsApi.getProfitabilityRanking(period, 10),
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load profitability ranking</AlertDescription>
      </Alert>
    );
  }

  const rankings = data?.rankings || [];

  const pieData = rankings.slice(0, 5).map((r) => ({
    name: r.serviceName,
    value: r.profit,
    color: r.serviceColor,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Profitability Ranking
            </CardTitle>
            <CardDescription>Services ranked by profit contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankings.map((ranking) => (
                <div
                  key={ranking.serviceId}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary">
                    #{ranking.rank}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ranking.serviceColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ranking.serviceName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Margin: {ranking.profitMargin.toFixed(1)}%</span>
                      <span>·</span>
                      <span>ROI: {ranking.roi.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(ranking.profit)}</p>
                    <div className="flex items-center justify-end gap-1 text-sm">
                      {ranking.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : ranking.trend === "down" ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500" />
                      )}
                      <span
                        className={
                          ranking.trend === "up"
                            ? "text-green-600"
                            : ranking.trend === "down"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }
                      >
                        {ranking.trend === "stable"
                          ? "Stable"
                          : formatPercent(
                              ((ranking.profit - ranking.previousProfit) / (ranking.previousProfit || 1)) * 100
                            )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profit Share Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Profit Distribution
            </CardTitle>
            <CardDescription>Share of total profit by service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rankings.slice(0, 6).map((r) => (
              <div key={r.serviceId} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.serviceColor }} />
                  <span className="font-medium">{r.serviceName}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Revenue Share</span>
                      <span>{r.revenueShare.toFixed(1)}%</span>
                    </div>
                    <Progress value={r.revenueShare} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Profit Share</span>
                      <span>{r.profitShare.toFixed(1)}%</span>
                    </div>
                    <Progress value={r.profitShare} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cash Flow Tab
function CashFlowTab() {
  const [months, setMonths] = useState("12");
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "cash-flow", months],
    queryFn: () => analyticsApi.getCashFlow(parseInt(months)),
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load cash flow data</AlertDescription>
      </Alert>
    );
  }

  const cashFlow = data?.cashFlow || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                Total Inflows
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{formatCurrency(summary.totalInflows)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                Total Outflows
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">{formatCurrency(summary.totalOutflows)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Net Cash Flow
              </CardDescription>
              <CardTitle className={`text-2xl ${summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.netCashFlow)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Monthly Average
              </CardDescription>
              <CardTitle className={`text-2xl ${summary.averageMonthlyNet >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.averageMonthlyNet)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-end">
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Over Time</CardTitle>
          <CardDescription>Monthly inflows, outflows, and net cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inflows"
                  name="Inflows"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="outflows"
                  name="Outflows"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="netCashFlow"
                  name="Net Cash Flow"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Cash Flow</CardTitle>
          <CardDescription>Running total of net cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Cumulative"]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeCashFlow"
                  name="Cumulative Cash Flow"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Best/Worst Months */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
                Best Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.bestMonth.net)}</p>
              <p className="text-muted-foreground">{summary.bestMonth.month}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
                Worst Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.worstMonth.net)}</p>
              <p className="text-muted-foreground">{summary.worstMonth.month}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Trends Tab
function TrendsTab({ period }: { period: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "trends", period],
    queryFn: () => analyticsApi.getTrends(period, "revenue"),
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load trend data</AlertDescription>
      </Alert>
    );
  }

  const trends = data?.trends || [];
  const summary = data?.summary;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "upward":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "downward":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "upward":
        return "text-green-600";
      case "downward":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overall Trend</CardDescription>
              <CardTitle className="flex items-center gap-2 text-xl">
                {getTrendIcon(summary.overallTrend)}
                <span className={getTrendColor(summary.overallTrend)}>
                  {summary.overallTrend.charAt(0).toUpperCase() + summary.overallTrend.slice(1)}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Growth</CardDescription>
              <CardTitle className={`text-2xl ${summary.averageGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(summary.averageGrowth)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Volatility</CardDescription>
              <CardTitle className="text-2xl">{summary.volatility.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Season</CardDescription>
              <CardTitle className="text-lg">
                {summary.seasonalPatterns.highSeason.length > 0
                  ? summary.seasonalPatterns.highSeason.join(", ")
                  : "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Revenue Trend Analysis
          </CardTitle>
          <CardDescription>Actual revenue vs moving average with trend detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  name="Moving Average"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Period-by-Period Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Period-by-Period Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {trends.slice(-12).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{t.period}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(t.revenue)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(t.trend)}
                  <Badge
                    variant={
                      t.momentum > 5 ? "default" : t.momentum < -5 ? "destructive" : "secondary"
                    }
                  >
                    {formatPercent(t.momentum)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Anomalies Tab
function AnomaliesTab() {
  const [type, setType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "anomalies", type, severity],
    queryFn: () =>
      analyticsApi.getAnomalies(
        type === "all" ? undefined : type,
        severity === "all" ? undefined : severity,
        50
      ),
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load anomaly data</AlertDescription>
      </Alert>
    );
  }

  const anomalies = data?.anomalies || [];
  const stats = data?.stats;

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Anomalies</CardDescription>
              <CardTitle className="text-2xl">{stats.totalAnomalies}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue Anomalies</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.revenueAnomalies}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Expense Anomalies</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.expenseAnomalies}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Deviation</CardDescription>
              <CardTitle className="text-2xl">{stats.avgDeviation.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Severity</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.severityDistribution.high}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Anomaly List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Detected Anomalies
          </CardTitle>
          <CardDescription>
            Transactions that deviate significantly from expected patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No anomalies detected with current filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    anomaly.severity === "high"
                      ? "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                      : anomaly.severity === "medium"
                      ? "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        anomaly.type === "revenue" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {anomaly.type === "revenue" ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{anomaly.description || anomaly.category || "Transaction"}</p>
                        <Badge variant={getSeverityColor(anomaly.severity) as any}>{anomaly.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {anomaly.serviceName && `${anomaly.serviceName} · `}
                        {new Date(anomaly.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(anomaly.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {formatCurrency(anomaly.expectedAmount)}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        anomaly.deviation > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPercent(anomaly.deviationPercent)} deviation
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Analytics Page
export default function Analytics() {
  const [period, setPeriod] = useState("year");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into profitability, cash flow, trends, and anomalies
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profit-margins" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profit-margins" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Profit Margins</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Cash Flow</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Anomalies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit-margins">
          <ProfitMarginsTab period={period} />
        </TabsContent>

        <TabsContent value="profitability">
          <ProfitabilityRankingTab period={period} />
        </TabsContent>

        <TabsContent value="cash-flow">
          <CashFlowTab />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab period={period} />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomaliesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

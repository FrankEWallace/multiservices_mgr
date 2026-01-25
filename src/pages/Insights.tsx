import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Bell,
  Target,
  Zap,
  Calendar,
  ArrowRight,
  ExternalLink,
  Clock,
  DollarSign,
  Activity,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import {
  insightsApi,
  AIInsight,
  InsightSeverity,
  Recommendation,
  Alert as AlertType,
  WeeklySummary,
} from "@/lib/api";

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

// Severity icons and colors
const severityConfig: Record<InsightSeverity, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  critical: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  success: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
  info: { icon: Info, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
};

// Impact badge colors
const impactColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

// Insight Card Component
function InsightCard({ insight }: { insight: AIInsight }) {
  const { icon: Icon, color, bgColor } = severityConfig[insight.severity];

  return (
    <Card className={`${bgColor} border-none`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <CardTitle className="text-base">{insight.title}</CardTitle>
          </div>
          <Badge
            variant={
              insight.severity === "critical"
                ? "destructive"
                : insight.severity === "success"
                ? "default"
                : "secondary"
            }
          >
            {insight.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{insight.description}</p>

        {(insight.value || insight.change !== undefined) && (
          <div className="flex items-center gap-4">
            {insight.value && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{insight.metric}:</span>
                <span className="text-sm font-bold">{insight.value}</span>
              </div>
            )}
            {insight.change !== undefined && (
              <div className={`flex items-center gap-1 ${insight.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {insight.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">{formatPercent(insight.change)}</span>
              </div>
            )}
          </div>
        )}

        {insight.recommendation && (
          <div className="pt-2 border-t">
            <p className="text-sm">
              <span className="font-medium">Recommendation:</span> {insight.recommendation}
            </p>
          </div>
        )}

        {insight.actionUrl && (
          <Link to={insight.actionUrl}>
            <Button variant="outline" size="sm" className="mt-2">
              View Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// AI Insights Tab
function AIInsightsTab() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", "ai", period],
    queryFn: () => insightsApi.getInsights(period),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load insights</AlertDescription>
      </Alert>
    );
  }

  const severityData = [
    { name: "Critical", value: data!.bySeverity.critical, color: "#ef4444" },
    { name: "Warning", value: data!.bySeverity.warning, color: "#f59e0b" },
    { name: "Success", value: data!.bySeverity.success, color: "#22c55e" },
    { name: "Info", value: data!.bySeverity.info, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {data!.totalInsights} insights found
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Insights</CardDescription>
            <CardTitle className="text-2xl">{data!.totalInsights}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data!.bySeverity.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{data!.bySeverity.warning}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Success</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data!.bySeverity.success}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Info</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{data!.bySeverity.info}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Distribution Chart */}
      {severityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights List */}
      {data!.insights.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">All Clear!</p>
            <p className="text-muted-foreground">No insights to report for this period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Recommendations Tab
function RecommendationsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", "recommendations"],
    queryFn: () => insightsApi.getRecommendations(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load recommendations</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Recommendations</CardDescription>
            <CardTitle className="text-2xl">{data!.totalRecommendations}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Impact</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data!.byImpact.high}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Medium Impact</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{data!.byImpact.medium}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Impact</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data!.byImpact.low}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recommendations List */}
      {data!.recommendations.length > 0 ? (
        <div className="space-y-4">
          {data!.recommendations.map((rec, index) => (
            <Card key={rec.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <CardDescription>{rec.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={impactColors[rec.impact]}>
                      {rec.impact} impact
                    </Badge>
                    <Badge variant="outline">
                      {rec.effort} effort
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rec.expectedBenefit && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm">
                      <span className="font-medium">Expected Benefit:</span> {rec.expectedBenefit}
                    </span>
                  </div>
                )}

                {rec.steps && rec.steps.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Action Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {rec.steps.map((step, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No Recommendations</p>
            <p className="text-muted-foreground">Your business is running optimally!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Alerts Tab
function AlertsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", "alerts"],
    queryFn: () => insightsApi.getAlerts(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load alerts</AlertDescription>
      </Alert>
    );
  }

  const alertTypeIcons: Record<string, typeof Bell> = {
    threshold: Activity,
    anomaly: Zap,
    deadline: Clock,
    reminder: Bell,
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alerts</CardDescription>
            <CardTitle className="text-2xl">{data!.totalAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data!.bySeverity.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{data!.bySeverity.warning}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Info</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{data!.bySeverity.info}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Alert Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Threshold</p>
                <p className="text-lg font-bold">{data!.byType.threshold}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Anomaly</p>
                <p className="text-lg font-bold">{data!.byType.anomaly}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="text-lg font-bold">{data!.byType.deadline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Bell className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Reminder</p>
                <p className="text-lg font-bold">{data!.byType.reminder}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {data!.alerts.length > 0 ? (
        <div className="space-y-3">
          {data!.alerts.map((alert) => {
            const { icon: SeverityIcon, color, bgColor } = severityConfig[alert.severity];
            const TypeIcon = alertTypeIcons[alert.type] || Bell;

            return (
              <Card key={alert.id} className={bgColor}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`p-2 rounded-full ${bgColor}`}>
                    <SeverityIcon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.title}</p>
                      <Badge variant="outline" className="text-xs">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Condition: {alert.condition}
                    </p>
                  </div>
                  <div className="text-right">
                    {alert.value && (
                      <p className="font-medium">{alert.value}</p>
                    )}
                    {alert.threshold && (
                      <p className="text-xs text-muted-foreground">
                        Threshold: {alert.threshold}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No Active Alerts</p>
            <p className="text-muted-foreground">Everything is running smoothly!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Weekly Summary Tab
function WeeklySummaryTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", "weekly-summary"],
    queryFn: () => insightsApi.getWeeklySummary(),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load weekly summary</AlertDescription>
      </Alert>
    );
  }

  const dailyChartData = data!.dailyBreakdown.revenue.map((r, i) => ({
    day: r.dayName,
    revenue: r.amount,
    expenses: data!.dailyBreakdown.expenses[i]?.amount || 0,
    profit: r.amount - (data!.dailyBreakdown.expenses[i]?.amount || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Weekly Business Summary
          </CardTitle>
          <CardDescription>
            Week {data!.period.weekNumber} • {data!.period.start} to {data!.period.end}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data!.summary.revenue.formatted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 ${data!.summary.revenue.change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data!.summary.revenue.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm">{formatPercent(data!.summary.revenue.change)} vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data!.summary.expenses.formatted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 ${data!.summary.expenses.change <= 0 ? "text-green-600" : "text-red-600"}`}>
              {data!.summary.expenses.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm">{formatPercent(data!.summary.expenses.change)} vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit</CardDescription>
            <CardTitle className={`text-2xl ${data!.summary.profit.current >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data!.summary.profit.formatted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 ${data!.summary.profit.change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data!.summary.profit.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm">{formatPercent(data!.summary.profit.change)} vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Debt Collected</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{data!.summary.debtCollected.formatted}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">Profit margin: {data!.summary.profit.margin.toFixed(1)}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Service Performance & Top Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data!.servicePerformance.slice(0, 5).map((service) => (
                <div key={service.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: service.color || "#3b82f6" }}
                      />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-sm">
                      {formatCurrency(service.revenue)} ({service.share}%)
                    </span>
                  </div>
                  <Progress value={Number(service.share)} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Top Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="revenue">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue">
                <div className="space-y-2">
                  {data!.topTransactions.revenue.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{t.description || "Revenue"}</p>
                        <p className="text-xs text-muted-foreground">{t.service || "General"}</p>
                      </div>
                      <span className="font-medium text-green-600">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="expenses">
                <div className="space-y-2">
                  {data!.topTransactions.expenses.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{t.description || "Expense"}</p>
                        <p className="text-xs text-muted-foreground">{t.category}</p>
                      </div>
                      <span className="font-medium text-red-600">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      {data!.goalsProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goals Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data!.goalsProgress.map((goal) => (
                <div key={goal.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium truncate">{goal.name}</span>
                    <Badge variant="outline">{goal.type}</Badge>
                  </div>
                  <Progress value={Number(goal.progress)} className="h-2 mb-1" />
                  <p className="text-sm text-muted-foreground text-right">{goal.progress}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {data!.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Key Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data!.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Insights Page
export default function Insights() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automated Insights</h1>
          <p className="text-muted-foreground">
            AI-generated insights, recommendations, alerts, and weekly summaries
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Recommendations</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Weekly Summary</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights">
            <AIInsightsTab />
          </TabsContent>

          <TabsContent value="recommendations">
            <RecommendationsTab />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsTab />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklySummaryTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

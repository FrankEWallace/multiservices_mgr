import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  LineChart as LineChartIcon,
  Target,
  Calendar,
  AlertTriangle,
  Sparkles,
  Building2,
  Sun,
  Snowflake,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from "recharts";
import { forecastingApi } from "@/lib/api";

const FORECAST_METHODS = [
  { value: "holt", label: "Holt's Linear Trend" },
  { value: "sma", label: "Simple Moving Average" },
  { value: "exponential", label: "Exponential Smoothing" },
];

const FORECAST_PERIODS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
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

// Revenue Forecasting Tab
function RevenueForecastTab() {
  const [method, setMethod] = useState("holt");
  const [months, setMonths] = useState("6");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasting", "revenue", method, months],
    queryFn: () => forecastingApi.getRevenueForecast(parseInt(months), method),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load revenue forecast</AlertDescription>
      </Alert>
    );
  }

  const chartData = [
    ...data!.historical.map((h) => ({
      month: h.month,
      actual: h.actual,
      forecast: null,
      lowerBound: null,
      upperBound: null,
    })),
    ...data!.forecasts.map((f) => ({
      month: f.month,
      actual: null,
      forecast: f.forecast,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
    })),
  ];

  const summary = data!.summary;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Monthly (Historical)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.avgMonthlyHistorical)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Monthly (Forecast)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.avgMonthlyForecast)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Forecast ({months}mo)</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(summary.totalForecast)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Growth Rate</CardDescription>
            <CardTitle className={`text-2xl flex items-center gap-2 ${summary.trend === "up" ? "text-green-600" : summary.trend === "down" ? "text-red-600" : ""}`}>
              {summary.trend === "up" ? <TrendingUp className="h-5 w-5" /> : summary.trend === "down" ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              {formatPercent(summary.growthRate)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>Historical data with {months}-month forecast (95% confidence interval)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [value ? formatCurrency(value) : "N/A", name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  name="Upper Bound"
                  stroke="transparent"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  name="Lower Bound"
                  stroke="transparent"
                  fill="#ffffff"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#3b82f6", r: 4 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Seasonality */}
      {data!.seasonality && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seasonal Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">Peak Months:</span>
                {data!.seasonality.highSeason.length > 0 ? (
                  data!.seasonality.highSeason.map((m) => (
                    <Badge key={m} variant="default">
                      Month {m}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">None detected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Low Months:</span>
                {data!.seasonality.lowSeason.length > 0 ? (
                  data!.seasonality.lowSeason.map((m) => (
                    <Badge key={m} variant="secondary">
                      Month {m}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">None detected</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Profit Predictions Tab
function ProfitPredictionsTab() {
  const [method, setMethod] = useState("holt");
  const [months, setMonths] = useState("6");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasting", "profit", method, months],
    queryFn: () => forecastingApi.getProfitForecast(parseInt(months), method),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load profit forecast</AlertDescription>
      </Alert>
    );
  }

  const chartData = [
    ...data!.historical.map((h) => ({
      month: h.month,
      revenue: h.revenue,
      expenses: h.expenses,
      profit: h.profit,
      type: "historical",
    })),
    ...data!.forecasts.map((f) => ({
      month: f.month,
      revenue: f.revenue,
      expenses: f.expenses,
      profit: f.profit,
      profitMargin: f.profitMargin,
      type: "forecast",
    })),
  ];

  const summary = data!.summary;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast Revenue</CardDescription>
            <CardTitle className="text-xl text-green-600">{formatCurrency(summary.totalForecastRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast Expenses</CardDescription>
            <CardTitle className="text-xl text-red-600">{formatCurrency(summary.totalForecastExpenses)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast Profit</CardDescription>
            <CardTitle className={`text-xl ${summary.totalForecastProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.totalForecastProfit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Profit Margin</CardDescription>
            <CardTitle className="text-xl">{summary.avgProfitMargin.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trend</CardDescription>
            <CardTitle className={`text-xl flex items-center gap-2 ${summary.trend === "up" ? "text-green-600" : summary.trend === "down" ? "text-red-600" : ""}`}>
              {summary.trend === "up" ? <TrendingUp className="h-5 w-5" /> : summary.trend === "down" ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              {summary.trend.charAt(0).toUpperCase() + summary.trend.slice(1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Profit Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Forecast</CardTitle>
          <CardDescription>Revenue, expenses, and profit projection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data!.forecasts.map((f) => (
              <div key={f.month} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{f.month}</span>
                  <Badge variant={f.profit >= 0 ? "default" : "destructive"}>
                    {f.profitMargin.toFixed(1)}% margin
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="text-green-600">{formatCurrency(f.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="text-red-600">{formatCurrency(f.expenses)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span className={f.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(f.profit)}
                    </span>
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

// Scenario Planning Tab
function ScenarioPlanningTab() {
  const [months, setMonths] = useState("12");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasting", "scenarios", months],
    queryFn: () => forecastingApi.getScenarios(parseInt(months)),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load scenarios</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months</SelectItem>
            <SelectItem value="24">24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Baseline */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline (Current Performance)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data!.baseline.avgMonthlyRevenue)}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Monthly Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data!.baseline.avgMonthlyExpenses)}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Monthly Profit</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data!.baseline.avgMonthlyProfit)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Scenario Comparison
          </CardTitle>
          <CardDescription>Compare different business scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data!.scenarios.map((s) => ({
                  name: s.name,
                  revenue: s.annual.revenue,
                  expenses: s.annual.expenses,
                  profit: s.annual.profit,
                  color: s.color,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Annual Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Annual Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Annual Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data!.scenarios.map((scenario) => (
          <Card key={scenario.name} className="relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: scenario.color }}
            />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {scenario.name}
                {scenario.name === "Baseline" && <Badge variant="outline">Current</Badge>}
              </CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Revenue Growth</p>
                  <p className={`font-medium ${scenario.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {scenario.revenueGrowth >= 0 ? "+" : ""}{scenario.revenueGrowth}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expense Change</p>
                  <p className={`font-medium ${scenario.expenseGrowth <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {scenario.expenseGrowth >= 0 ? "+" : ""}{scenario.expenseGrowth}%
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Annual Profit</span>
                  <span className={`font-bold ${scenario.annual.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(scenario.annual.profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <Badge variant={scenario.monthlyAvg.profitMargin >= 20 ? "default" : "secondary"}>
                    {scenario.monthlyAvg.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Seasonal Analysis Tab
function SeasonalAnalysisTab() {
  const [metric, setMetric] = useState("revenue");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasting", "seasonal", metric],
    queryFn: () => forecastingApi.getSeasonalAnalysis(metric),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load seasonal analysis</AlertDescription>
      </Alert>
    );
  }

  const radarData = data!.monthlyAnalysis.map((m) => ({
    month: m.monthName,
    index: m.seasonalIndex * 100,
    average: m.average,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Patterns</CardTitle>
          <CardDescription>{data!.patterns.recommendation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Overall Average</p>
              <p className="text-xl font-bold">{formatCurrency(data!.overallAverage)}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Seasonal Strength</p>
              <p className="text-xl font-bold">{(data!.patterns.seasonalStrength * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-sm text-muted-foreground">Peak Months</p>
              <p className="text-lg font-bold text-green-600">
                {data!.patterns.peakMonths.length > 0 ? data!.patterns.peakMonths.join(", ") : "None"}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <p className="text-sm text-muted-foreground">Low Months</p>
              <p className="text-lg font-bold text-blue-600">
                {data!.patterns.lowMonths.length > 0 ? data!.patterns.lowMonths.join(", ") : "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Index by Month</CardTitle>
            <CardDescription>Values above 100 indicate above-average performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="month" className="text-sm" />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} />
                  <Radar
                    name="Seasonal Index"
                    dataKey="index"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.5}
                  />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(0)}%`, "Index"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.monthlyAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthName" className="text-sm" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Average"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar
                    dataKey="average"
                    name="Average"
                    radius={[4, 4, 0, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {data!.quarterlyAnalysis.map((q) => (
              <div
                key={q.quarter}
                className={`p-4 border rounded-lg ${
                  q.classification === "strong"
                    ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                    : q.classification === "weak"
                    ? "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                    : ""
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{q.quarter}</span>
                  <Badge
                    variant={
                      q.classification === "strong"
                        ? "default"
                        : q.classification === "weak"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {q.classification}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{q.months.join(", ")}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Index</span>
                    <span className="font-medium">{(q.avgSeasonalIndex * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Total</span>
                    <span className="font-medium">{formatCurrency(q.totalAverage)}</span>
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

// Service Forecasts Tab
function ServiceForecastsTab() {
  const [months, setMonths] = useState("6");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasting", "by-service", months],
    queryFn: () => forecastingApi.getServiceForecasts(parseInt(months)),
  });

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load service forecasts</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {FORECAST_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Forecast Revenue</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(data!.summary.totalForecastRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Forecast Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(data!.summary.totalForecastExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Forecast Profit</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(data!.summary.totalForecastProfit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Growing</CardDescription>
            <CardTitle className="text-lg">
              {data!.summary.topGrowing.length > 0 ? data!.summary.topGrowing.join(", ") : "None"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Service Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Service-Level Forecasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data!.services.map((s) => ({
                  name: s.serviceName,
                  forecast: s.forecast.totalProfit,
                  historical: s.historical.avgMonthlyProfit * parseInt(months),
                  color: s.serviceColor,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-sm" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="historical" name="Historical (Projected)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecast" name="Forecast" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data!.services.map((service) => (
          <Card key={service.serviceId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.serviceColor }}
                  />
                  {service.serviceName}
                </CardTitle>
                <Badge
                  variant={
                    service.trend === "up"
                      ? "default"
                      : service.trend === "down"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {service.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : service.trend === "down" ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : (
                    <Minus className="h-3 w-3 mr-1" />
                  )}
                  {formatPercent(service.growthRate)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Historical Avg/mo</p>
                    <p className="font-medium">{formatCurrency(service.historical.avgMonthlyProfit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Forecast Avg/mo</p>
                    <p className="font-medium">{formatCurrency(service.forecast.avgMonthlyProfit)}</p>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Forecast Profit</span>
                    <span
                      className={`font-bold ${
                        service.forecast.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(service.forecast.totalProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Main Projections Page
export default function Projections() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projections & Forecasting</h1>
          <p className="text-muted-foreground">
            Revenue forecasts, profit predictions, scenario planning, and seasonal analysis
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Profit</span>
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Scenarios</span>
            </TabsTrigger>
            <TabsTrigger value="seasonal" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Seasonal</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <RevenueForecastTab />
          </TabsContent>

          <TabsContent value="profit">
            <ProfitPredictionsTab />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenarioPlanningTab />
          </TabsContent>

          <TabsContent value="seasonal">
            <SeasonalAnalysisTab />
          </TabsContent>

          <TabsContent value="services">
            <ServiceForecastsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

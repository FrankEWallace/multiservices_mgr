import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  BarChart2, 
  PieChart, 
  TrendingUp, 
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  FileDown,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  reportsApi, 
  servicesApi,
  DailyReport, 
  WeeklyReport, 
  MonthlyReport, 
  ServiceReport,
  DebtsAgingReport,
  GoalsReport
} from "@/lib/api";
import { 
  exportReport, 
  type ExportFormat 
} from "@/lib/export-utils";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");

  // Fetch services for service report
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  // Daily Report
  const { data: dailyReport, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ["report-daily", format(selectedDate, "yyyy-MM-dd")],
    queryFn: () => reportsApi.getDaily(format(selectedDate, "yyyy-MM-dd")),
    enabled: activeTab === "daily",
  });

  // Weekly Report
  const { data: weeklyReport, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery({
    queryKey: ["report-weekly"],
    queryFn: () => reportsApi.getWeekly(),
    enabled: activeTab === "weekly",
  });

  // Monthly Report
  const { data: monthlyReport, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ["report-monthly", selectedMonth, selectedYear],
    queryFn: () => reportsApi.getMonthly(selectedMonth, selectedYear),
    enabled: activeTab === "monthly",
  });

  // Service Report
  const { data: serviceReport, isLoading: serviceLoading, refetch: refetchService } = useQuery({
    queryKey: ["report-service", selectedServiceId, selectedPeriod],
    queryFn: () => reportsApi.getService(selectedServiceId!, selectedPeriod),
    enabled: activeTab === "service" && selectedServiceId !== null,
  });

  // Debts Aging Report
  const { data: debtsAgingReport, isLoading: debtsLoading, refetch: refetchDebts } = useQuery({
    queryKey: ["report-debts-aging"],
    queryFn: () => reportsApi.getDebtsAging(),
    enabled: activeTab === "debts",
  });

  // Goals Report
  const { data: goalsReport, isLoading: goalsLoading, refetch: refetchGoals } = useQuery({
    queryKey: ["report-goals"],
    queryFn: () => reportsApi.getGoals(),
    enabled: activeTab === "goals",
  });

  // Get current report data based on active tab
  const getCurrentReportData = () => {
    switch (activeTab) {
      case "daily": return dailyReport;
      case "weekly": return weeklyReport;
      case "monthly": return monthlyReport;
      case "service": return serviceReport;
      case "debts": return debtsAgingReport;
      case "goals": return goalsReport;
      default: return null;
    }
  };

  const handleExport = (exportFormat: ExportFormat) => {
    const data = getCurrentReportData();
    if (!data) {
      console.warn("No data available to export");
      return;
    }
    exportReport(activeTab, exportFormat, data);
  };

  const isExportDisabled = () => {
    switch (activeTab) {
      case "daily": return !dailyReport || dailyLoading;
      case "weekly": return !weeklyReport || weeklyLoading;
      case "monthly": return !monthlyReport || monthlyLoading;
      case "service": return !serviceReport || serviceLoading || !selectedServiceId;
      case "debts": return !debtsAgingReport || debtsLoading;
      case "goals": return !goalsReport || goalsLoading;
      default: return true;
    }
  };

  const reportTabs = [
    { id: "daily", label: "Daily", icon: CalendarIcon },
    { id: "weekly", label: "Weekly", icon: BarChart2 },
    { id: "monthly", label: "Monthly", icon: FileText },
    { id: "service", label: "Service", icon: PieChart },
    { id: "debts", label: "Debts Aging", icon: Clock },
    { id: "goals", label: "Goals", icon: Target },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Generate and download business reports</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => handleExport("print")}
              disabled={isExportDisabled()}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="gap-2 bg-primary hover:bg-primary/90"
                  disabled={isExportDisabled()}
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-red-500" />
                  PDF Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Excel Spreadsheet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4 text-blue-500" />
                  CSV File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-2 cursor-pointer">
                  <Printer className="w-4 h-4 text-gray-500" />
                  Print Preview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full print:hidden">
            {reportTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Daily Report Tab */}
          <TabsContent value="daily" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Daily Summary Report</CardTitle>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(selectedDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={() => refetchDaily()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {dailyLoading ? (
              <ReportSkeleton />
            ) : dailyReport ? (
              <DailyReportView report={dailyReport} />
            ) : (
              <EmptyReport message="No data available for this date" />
            )}
          </TabsContent>

          {/* Weekly Report Tab */}
          <TabsContent value="weekly" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Weekly Performance Report</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => refetchWeekly()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                {weeklyReport && (
                  <CardDescription>
                    {weeklyReport.period.startDate} to {weeklyReport.period.endDate}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            {weeklyLoading ? (
              <ReportSkeleton />
            ) : weeklyReport ? (
              <WeeklyReportView report={weeklyReport} />
            ) : (
              <EmptyReport message="No weekly data available" />
            )}
          </TabsContent>

          {/* Monthly Report Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Monthly Financial Report</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={selectedMonth.toString()} 
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={selectedYear.toString()} 
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => refetchMonthly()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {monthlyLoading ? (
              <ReportSkeleton />
            ) : monthlyReport ? (
              <MonthlyReportView report={monthlyReport} />
            ) : (
              <EmptyReport message="No monthly data available" />
            )}
          </TabsContent>

          {/* Service Report Tab */}
          <TabsContent value="service" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Service-Wise Report</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={selectedServiceId?.toString() || ""} 
                      onValueChange={(v) => setSelectedServiceId(parseInt(v))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicesData?.services.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="this_quarter">This Quarter</SelectItem>
                        <SelectItem value="this_year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => refetchService()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {!selectedServiceId ? (
              <EmptyReport message="Please select a service to view the report" />
            ) : serviceLoading ? (
              <ReportSkeleton />
            ) : serviceReport ? (
              <ServiceReportView report={serviceReport} />
            ) : (
              <EmptyReport message="No data available for this service" />
            )}
          </TabsContent>

          {/* Debts Aging Report Tab */}
          <TabsContent value="debts" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Debts Aging Report</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => refetchDebts()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {debtsLoading ? (
              <ReportSkeleton />
            ) : debtsAgingReport ? (
              <DebtsAgingReportView report={debtsAgingReport} />
            ) : (
              <EmptyReport message="No debts data available" />
            )}
          </TabsContent>

          {/* Goals Report Tab */}
          <TabsContent value="goals" className="space-y-4">
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Goal Achievement Report</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => refetchGoals()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {goalsLoading ? (
              <ReportSkeleton />
            ) : goalsReport ? (
              <GoalsReportView report={goalsReport} />
            ) : (
              <EmptyReport message="No goals data available" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// ============ DAILY REPORT VIEW ============
const DailyReportView = ({ report }: { report: DailyReport }) => (
  <div className="space-y-6">
    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Revenue"
        value={report.summary.totalRevenueFormatted}
        change={parseFloat(report.comparison.revenueChange)}
        icon={DollarSign}
        iconColor="text-green-500"
      />
      <SummaryCard
        title="Total Expenses"
        value={report.summary.totalExpensesFormatted}
        change={parseFloat(report.comparison.expenseChange)}
        icon={TrendingUp}
        iconColor="text-red-500"
        inverseColors
      />
      <SummaryCard
        title="Net Profit"
        value={report.summary.netProfitFormatted}
        subtitle={`${report.summary.profitMargin}% margin`}
        icon={BarChart2}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="Debt Payments"
        value={report.summary.totalDebtPaymentsFormatted}
        subtitle={`New: ${report.summary.totalNewDebtsFormatted}`}
        icon={Clock}
        iconColor="text-orange-500"
      />
    </div>

    {/* Breakdown */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Service</CardTitle>
        </CardHeader>
        <CardContent>
          {report.breakdown.revenueByService.length > 0 ? (
            <div className="space-y-4">
              {report.breakdown.revenueByService.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.serviceName}</span>
                    <span>{item.totalFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={parseFloat(item.percentage)} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No revenue recorded</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {report.breakdown.expensesByCategory.length > 0 ? (
            <div className="space-y-4">
              {report.breakdown.expensesByCategory.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{item.category}</span>
                    <span>{item.totalFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={parseFloat(item.percentage)} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No expenses recorded</p>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Debt Activity */}
    {(report.breakdown.debtPayments.length > 0 || report.breakdown.newDebts.length > 0) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {report.breakdown.debtPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debt Payments Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.breakdown.debtPayments.map((payment, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                    <span className="font-medium">{payment.debtorName}</span>
                    <span className="text-green-600 font-semibold">{payment.amountFormatted}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {report.breakdown.newDebts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Debts Issued</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.breakdown.newDebts.map((debt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
                    <span className="font-medium">{debt.debtorName}</span>
                    <span className="text-orange-600 font-semibold">{debt.amountFormatted}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )}
  </div>
);

// ============ WEEKLY REPORT VIEW ============
const WeeklyReportView = ({ report }: { report: WeeklyReport }) => (
  <div className="space-y-6">
    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Weekly Revenue"
        value={report.summary.totalRevenueFormatted}
        change={parseFloat(report.comparison.revenueChange)}
        icon={DollarSign}
        iconColor="text-green-500"
      />
      <SummaryCard
        title="Weekly Expenses"
        value={report.summary.totalExpensesFormatted}
        change={parseFloat(report.comparison.expenseChange)}
        icon={TrendingUp}
        iconColor="text-red-500"
        inverseColors
      />
      <SummaryCard
        title="Net Profit"
        value={report.summary.netProfitFormatted}
        subtitle={`${report.summary.profitMargin}% margin`}
        icon={BarChart2}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="Avg Daily Revenue"
        value={report.summary.avgDailyRevenueFormatted}
        subtitle={`${report.summary.paymentsReceived} debt payments`}
        icon={CalendarIcon}
        iconColor="text-purple-500"
      />
    </div>

    {/* Highlights */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {report.highlights.bestDay && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Day</p>
                <p className="font-semibold">{new Date(report.highlights.bestDay.date).toLocaleDateString("en-US", { weekday: "long" })}</p>
                <p className="text-green-600 font-bold">{report.highlights.bestDay.revenueFormatted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {report.highlights.worstDay && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slowest Day</p>
                <p className="font-semibold">{new Date(report.highlights.worstDay.date).toLocaleDateString("en-US", { weekday: "long" })}</p>
                <p className="text-red-600 font-bold">{report.highlights.worstDay.revenueFormatted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {report.highlights.topService && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Service</p>
                <p className="font-semibold">{report.highlights.topService.name}</p>
                <p className="text-blue-600 font-bold">{report.highlights.topService.revenueFormatted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Daily Breakdown */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Daily Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Day</th>
                <th className="text-right py-3 px-2 font-medium">Revenue</th>
                <th className="text-right py-3 px-2 font-medium">Expenses</th>
                <th className="text-right py-3 px-2 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {report.dailyBreakdown.map((day, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{day.dayName}</p>
                      <p className="text-xs text-muted-foreground">{day.date}</p>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-green-600">{day.revenueFormatted}</td>
                  <td className="text-right py-3 px-2 text-red-600">{day.expensesFormatted}</td>
                  <td className={cn("text-right py-3 px-2 font-medium", day.profit >= 0 ? "text-green-600" : "text-red-600")}>
                    {day.profitFormatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {/* Service Performance */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Service Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {report.servicePerformance.map((service, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{service.serviceName}</span>
                <Badge variant={parseFloat(service.profitMargin) >= 20 ? "default" : "secondary"}>
                  {service.profitMargin}% margin
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-medium text-green-600">{service.revenueFormatted}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expenses</p>
                  <p className="font-medium text-red-600">{service.expensesFormatted}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profit</p>
                  <p className={cn("font-medium", service.profit >= 0 ? "text-green-600" : "text-red-600")}>
                    {service.profitFormatted}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============ MONTHLY REPORT VIEW ============
const MonthlyReportView = ({ report }: { report: MonthlyReport }) => (
  <div className="space-y-6">
    {/* Header */}
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{report.period.monthName} {report.period.year}</h2>
          <p className="text-muted-foreground">Financial Report • Day {report.period.daysPassed} of {report.period.daysInMonth}</p>
        </div>
      </CardContent>
    </Card>

    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Monthly Revenue"
        value={report.summary.totalRevenueFormatted}
        change={parseFloat(report.comparison.revenueChange)}
        icon={DollarSign}
        iconColor="text-green-500"
      />
      <SummaryCard
        title="Monthly Expenses"
        value={report.summary.totalExpensesFormatted}
        change={parseFloat(report.comparison.expenseChange)}
        icon={TrendingUp}
        iconColor="text-red-500"
        inverseColors
      />
      <SummaryCard
        title="Net Profit"
        value={report.summary.netProfitFormatted}
        subtitle={`${report.summary.grossProfitMargin}% margin`}
        icon={BarChart2}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="Projected Revenue"
        value={report.summary.projectedMonthlyRevenueFormatted}
        subtitle={`Avg ${report.summary.avgDailyRevenueFormatted}/day`}
        icon={Target}
        iconColor="text-purple-500"
      />
    </div>

    {/* Revenue & Expense Breakdown */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.revenueBreakdown.byService.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.serviceName}</span>
                  <span>{item.totalFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={parseFloat(item.percentage)} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.expenseBreakdown.byCategory.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{item.category}</span>
                  <span>{item.totalFormatted} ({item.count})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={parseFloat(item.percentage)} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Debt Summary */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Debt Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-xl font-bold text-orange-600">{report.debtSummary.totalOutstandingFormatted}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-500/10">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="text-xl font-bold text-green-600">{report.debtSummary.collectedThisMonthFormatted}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-500/10">
            <p className="text-sm text-muted-foreground">New Debts</p>
            <p className="text-xl font-bold text-red-600">{report.debtSummary.newDebtsThisMonthFormatted}</p>
          </div>
          <div className={cn("text-center p-4 rounded-lg", report.debtSummary.netDebtChange >= 0 ? "bg-green-500/10" : "bg-red-500/10")}>
            <p className="text-sm text-muted-foreground">Net Change</p>
            <p className={cn("text-xl font-bold", report.debtSummary.netDebtChange >= 0 ? "text-green-600" : "text-red-600")}>
              {report.debtSummary.netDebtChange >= 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(report.debtSummary.netDebtChange)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Goal Progress */}
    {report.goalProgress.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Goals Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.goalProgress.map((goal, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{goal.goalType}</p>
                  </div>
                  <Badge variant={goal.status === "completed" ? "default" : goal.status === "active" ? "secondary" : "destructive"}>
                    {goal.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{goal.currentAmountFormatted}</span>
                    <span>{goal.targetAmountFormatted}</span>
                  </div>
                  <Progress value={parseFloat(goal.progress)} />
                  <p className="text-xs text-muted-foreground text-right">{goal.progress}% complete</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

// ============ SERVICE REPORT VIEW ============
const ServiceReportView = ({ report }: { report: ServiceReport }) => (
  <div className="space-y-6">
    {/* Service Header */}
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-primary/20">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{report.service.name}</h2>
            <p className="text-muted-foreground">{report.service.description}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span>Daily Target: {new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(report.service.dailyTarget)}</span>
              <span>Monthly Target: {new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(report.service.monthlyTarget)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Summary */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Revenue"
        value={report.summary.totalRevenueFormatted}
        icon={DollarSign}
        iconColor="text-green-500"
      />
      <SummaryCard
        title="Expenses"
        value={report.summary.totalExpensesFormatted}
        icon={TrendingUp}
        iconColor="text-red-500"
      />
      <SummaryCard
        title="Profit"
        value={report.summary.netProfitFormatted}
        subtitle={`${report.summary.profitMargin}% margin`}
        icon={BarChart2}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="Outstanding Debt"
        value={report.summary.totalDebtFormatted}
        subtitle={`${report.summary.transactionCount} transactions`}
        icon={Clock}
        iconColor="text-orange-500"
      />
    </div>

    {/* Breakdown Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.revenueBreakdown.byPaymentMethod.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{item.method}</span>
                  <span>{item.totalFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={parseFloat(item.percentage)} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.expenseBreakdown.byCategory.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{item.category}</span>
                  <span>{item.totalFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={parseFloat(item.percentage)} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Recent Transactions */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {report.revenueBreakdown.transactions.slice(0, 10).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{t.description || "Revenue"}</p>
                  <p className="text-xs text-muted-foreground">{t.date} • {t.paymentMethod}</p>
                </div>
                <span className="text-green-600 font-semibold">{t.amountFormatted}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {report.expenseBreakdown.transactions.slice(0, 10).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{t.description || "Expense"}</p>
                  <p className="text-xs text-muted-foreground">{t.date} • {t.category}</p>
                </div>
                <span className="text-red-600 font-semibold">{t.amountFormatted}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// ============ DEBTS AGING REPORT VIEW ============
const DebtsAgingReportView = ({ report }: { report: DebtsAgingReport }) => (
  <div className="space-y-6">
    {/* Summary */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Outstanding"
        value={report.summary.totalOutstandingFormatted}
        subtitle={`${report.summary.totalDebtors} debtors`}
        icon={DollarSign}
        iconColor="text-orange-500"
      />
      <SummaryCard
        title="Total Overdue"
        value={report.summary.totalOverdueFormatted}
        subtitle={`${report.summary.overduePercentage}% of total`}
        icon={AlertTriangle}
        iconColor="text-red-500"
      />
      <SummaryCard
        title="Avg Debt Age"
        value={`${report.summary.avgDebtAge} days`}
        icon={Clock}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="Current (Not Due)"
        value={report.agingBuckets.current.totalFormatted}
        subtitle={`${report.agingBuckets.current.count} debts`}
        icon={CheckCircle2}
        iconColor="text-green-500"
      />
    </div>

    {/* Aging Buckets */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Aging Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Current", data: report.agingBuckets.current, color: "bg-green-500" },
            { label: "1-30 Days", data: report.agingBuckets.days1to30, color: "bg-yellow-500" },
            { label: "31-60 Days", data: report.agingBuckets.days31to60, color: "bg-orange-500" },
            { label: "61-90 Days", data: report.agingBuckets.days61to90, color: "bg-red-500" },
            { label: "90+ Days", data: report.agingBuckets.over90, color: "bg-red-700" },
          ].map((bucket, i) => (
            <div key={i} className="text-center p-4 rounded-lg border">
              <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", bucket.color)} />
              <p className="text-xs text-muted-foreground">{bucket.label}</p>
              <p className="text-lg font-bold">{bucket.data.totalFormatted}</p>
              <p className="text-xs text-muted-foreground">{bucket.data.count} debts</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Debt by Service */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Debt by Service</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {report.debtByService.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.serviceName}</span>
                <span>{item.totalBalanceFormatted} ({item.count})</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={parseFloat(item.percentage)} className="flex-1" />
                <span className="text-xs text-muted-foreground w-12">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Top Debtors */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Debtors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Debtor</th>
                <th className="text-left py-3 px-2 font-medium">Service</th>
                <th className="text-right py-3 px-2 font-medium">Original</th>
                <th className="text-right py-3 px-2 font-medium">Paid</th>
                <th className="text-right py-3 px-2 font-medium">Balance</th>
                <th className="text-center py-3 px-2 font-medium">Days Overdue</th>
                <th className="text-center py-3 px-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.topDebtors.map((debt, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <p className="font-medium">{debt.debtorName}</p>
                    <p className="text-xs text-muted-foreground">{debt.debtorContact}</p>
                  </td>
                  <td className="py-3 px-2 text-sm">{debt.serviceName}</td>
                  <td className="text-right py-3 px-2">{debt.originalAmountFormatted}</td>
                  <td className="text-right py-3 px-2 text-green-600">{debt.amountPaidFormatted}</td>
                  <td className="text-right py-3 px-2 font-semibold text-orange-600">{debt.balanceFormatted}</td>
                  <td className="text-center py-3 px-2">
                    {debt.daysOverdue > 0 ? (
                      <Badge variant="destructive">{debt.daysOverdue} days</Badge>
                    ) : (
                      <Badge variant="secondary">Not due</Badge>
                    )}
                  </td>
                  <td className="text-center py-3 px-2">
                    <Badge variant={debt.status === "current" ? "secondary" : debt.status === "overdue" ? "destructive" : "outline"}>
                      {debt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============ GOALS REPORT VIEW ============
const GoalsReportView = ({ report }: { report: GoalsReport }) => (
  <div className="space-y-6">
    {/* Summary */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Active Goals"
        value={report.summary.totalActiveGoals.toString()}
        subtitle={`${report.summary.onTrackGoals} on track`}
        icon={Target}
        iconColor="text-blue-500"
      />
      <SummaryCard
        title="At Risk"
        value={report.summary.atRiskGoals.toString()}
        icon={AlertTriangle}
        iconColor="text-orange-500"
      />
      <SummaryCard
        title="Success Rate"
        value={`${report.summary.successRate}%`}
        subtitle={`${report.summary.completedAllTime} completed`}
        icon={CheckCircle2}
        iconColor="text-green-500"
      />
      <SummaryCard
        title="Avg Achievement"
        value={`${report.summary.avgAchievementRate}%`}
        subtitle={`${report.summary.missedAllTime} missed`}
        icon={BarChart2}
        iconColor="text-purple-500"
      />
    </div>

    {/* Goals by Type & Period */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(report.goalsByType).map(([type, data]) => (
              <div key={type} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{type}</span>
                  <Badge>{data.count} goals</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target</span>
                    <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(data.totalTarget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current</span>
                    <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(data.totalCurrent)}</span>
                  </div>
                  <Progress value={data.totalTarget > 0 ? (data.totalCurrent / data.totalTarget) * 100 : 0} className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(report.goalsByPeriod).map(([period, count]) => (
              <div key={period} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium capitalize">{period}</span>
                <Badge variant="secondary">{count} goals</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Active Goals */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Active Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {report.activeGoals.map((goal, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{goal.title}</p>
                  <p className="text-sm text-muted-foreground">{goal.serviceName} • {goal.goalType} • {goal.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  {goal.isOnTrack ? (
                    <Badge className="bg-green-500">On Track</Badge>
                  ) : (
                    <Badge variant="destructive">At Risk</Badge>
                  )}
                  {goal.daysRemaining !== undefined && (
                    <Badge variant="outline">{goal.daysRemaining} days left</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{goal.currentAmountFormatted}</span>
                  <span>{goal.targetAmountFormatted}</span>
                </div>
                <Progress value={parseFloat(goal.progress)} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.progress}% complete</span>
                  <span>Remaining: {goal.remainingFormatted}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Achievement History */}
    {report.achievementHistory.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Achievement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Goal</th>
                  <th className="text-left py-3 px-2 font-medium">Type</th>
                  <th className="text-right py-3 px-2 font-medium">Target</th>
                  <th className="text-right py-3 px-2 font-medium">Achieved</th>
                  <th className="text-center py-3 px-2 font-medium">Rate</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.achievementHistory.slice(0, 10).map((goal, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-2">
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{goal.serviceName}</p>
                    </td>
                    <td className="py-3 px-2 text-sm capitalize">{goal.goalType}</td>
                    <td className="text-right py-3 px-2">{goal.targetAmountFormatted}</td>
                    <td className="text-right py-3 px-2">{goal.achievedAmountFormatted}</td>
                    <td className="text-center py-3 px-2">
                      <Badge variant={parseFloat(goal.achievementRate) >= 100 ? "default" : "secondary"}>
                        {goal.achievementRate}%
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      {goal.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

// ============ HELPER COMPONENTS ============
const SummaryCard = ({ 
  title, 
  value, 
  change, 
  subtitle, 
  icon: Icon, 
  iconColor,
  inverseColors = false 
}: { 
  title: string; 
  value: string; 
  change?: number; 
  subtitle?: string; 
  icon: React.ElementType; 
  iconColor: string;
  inverseColors?: boolean;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm mt-1",
              inverseColors 
                ? (change > 0 ? "text-red-500" : "text-green-500")
                : (change > 0 ? "text-green-500" : "text-red-500")
            )}>
              {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(change)}% vs previous
            </div>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-full bg-muted/50", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ReportSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

const EmptyReport = ({ message }: { message: string }) => (
  <Card>
    <CardContent className="py-12">
      <div className="text-center text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{message}</p>
      </div>
    </CardContent>
  </Card>
);

export default Reports;

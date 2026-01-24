import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revenueApi, expensesApi, servicesApi, debtsApi } from "@/lib/api";
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
} from "recharts";
import { ExternalLink, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface DrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "revenue" | "profit" | "expenses" | "debt" | "service" | null;
  title?: string;
  dateRange?: { from: Date; to: Date };
}

const COLORS = ["hsl(160, 84%, 39%)", "hsl(199, 89%, 48%)", "hsl(280, 65%, 60%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)"];

export function DrillDownDialog({ open, onOpenChange, type, title, dateRange }: DrillDownDialogProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  // Fetch relevant data based on type
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["drilldown", "revenue", fromDate, toDate],
    queryFn: () => revenueApi.getAll(50),
    enabled: open && (type === "revenue" || type === "profit"),
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["drilldown", "expenses", fromDate, toDate],
    queryFn: () => expensesApi.getAll(50),
    enabled: open && (type === "expenses" || type === "profit"),
  });

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ["drilldown", "services"],
    queryFn: servicesApi.getAll,
    enabled: open && type === "service",
  });

  const { data: debtData, isLoading: debtLoading } = useQuery({
    queryKey: ["drilldown", "debts"],
    queryFn: () => debtsApi.getAll(),
    enabled: open && type === "debt",
  });

  const isLoading = revenueLoading || expenseLoading || serviceLoading || debtLoading;

  const getTitle = () => {
    switch (type) {
      case "revenue":
        return "Revenue Details";
      case "profit":
        return "Profit Analysis";
      case "expenses":
        return "Expense Breakdown";
      case "debt":
        return "Outstanding Debts";
      case "service":
        return "Service Performance";
      default:
        return title || "Details";
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </div>
      );
    }

    switch (type) {
      case "revenue":
        return <RevenueBreakdown data={revenueData?.revenues || []} />;
      case "profit":
        return (
          <ProfitBreakdown
            revenues={revenueData?.revenues || []}
            expenses={expenseData?.expenses || []}
          />
        );
      case "expenses":
        return <ExpenseBreakdown data={expenseData?.expenses || []} />;
      case "debt":
        return <DebtBreakdown data={debtData?.debts || []} />;
      case "service":
        return <ServiceBreakdown data={serviceData?.services || []} />;
      default:
        return <div className="text-center py-8 text-muted-foreground">Select a metric to view details</div>;
    }
  };

  const getNavigatePath = () => {
    switch (type) {
      case "revenue":
        return "/revenue";
      case "expenses":
        return "/expenses";
      case "debt":
        return "/madeni";
      case "service":
        return "/services";
      default:
        return null;
    }
  };

  const navigatePath = getNavigatePath();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{getTitle()}</DialogTitle>
            {navigatePath && (
              <Button variant="outline" size="sm" onClick={() => navigate(navigatePath)} className="gap-2">
                View All <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="mt-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

// Revenue breakdown component
function RevenueBreakdown({ data }: { data: any[] }) {
  const byService = data.reduce((acc, r) => {
    const name = r.serviceName || "Unknown";
    acc[name] = (acc[name] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(byService).map(([name, value]) => ({ name, value }));
  const total = data.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Tabs defaultValue="chart">
      <TabsList className="mb-4">
        <TabsTrigger value="chart">Chart</TabsTrigger>
        <TabsTrigger value="table">Recent Entries</TabsTrigger>
      </TabsList>
      <TabsContent value="chart">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-4">Revenue by Service</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium mb-4">Summary</h4>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${total.toLocaleString()}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Average</p>
              <p className="text-2xl font-bold">${data.length > 0 ? Math.round(total / data.length).toLocaleString() : 0}</p>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell>{r.serviceName || "N/A"}</TableCell>
                <TableCell className="truncate max-w-[200px]">{r.description || "-"}</TableCell>
                <TableCell className="text-right font-medium">${r.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}

// Profit breakdown
function ProfitBreakdown({ revenues, expenses }: { revenues: any[]; expenses: any[] }) {
  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const chartData = [
    { name: "Revenue", value: totalRevenue, fill: "hsl(160, 84%, 39%)" },
    { name: "Expenses", value: totalExpenses, fill: "hsl(0, 84%, 60%)" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium mb-4">Revenue vs Expenses</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)" }} />
            <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fill: "hsl(215, 20%, 55%)" }} />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Bar dataKey="value" fill="hsl(160, 84%, 39%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        <div className="glass-card p-4 flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-success" />
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-success">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <TrendingDown className="w-8 h-8 text-danger" />
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-danger">${totalExpenses.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <DollarSign className={`w-8 h-8 ${profit >= 0 ? "text-success" : "text-danger"}`} />
          <div>
            <p className="text-sm text-muted-foreground">Net Profit</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
              ${profit.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Margin: {margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expense breakdown
function ExpenseBreakdown({ data }: { data: any[] }) {
  const byCategory = data.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  const total = data.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium mb-4">Expenses by Category</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
            <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} tick={{ fill: "hsl(215, 20%, 55%)" }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: "hsl(215, 20%, 55%)" }} />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Bar dataKey="value" fill="hsl(0, 84%, 60%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold text-danger">${total.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{Object.keys(byCategory).length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Largest Category</p>
          <p className="text-lg font-bold">
            {chartData.length > 0
              ? `${[...chartData].sort((a, b) => (b.value as number) - (a.value as number))[0].name}`
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Debt breakdown
function DebtBreakdown({ data }: { data: any[] }) {
  const total = data.reduce((sum, d) => sum + d.balance, 0);
  const overdue = data.filter((d) => d.status === "overdue");
  const overdueAmount = overdue.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold">${total.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Debtors</p>
          <p className="text-2xl font-bold">{data.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-danger">{overdue.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Overdue Amount</p>
          <p className="text-2xl font-bold text-danger">${overdueAmount.toLocaleString()}</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Debtor</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 8).map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.debtorName}</TableCell>
              <TableCell>{d.serviceName || "N/A"}</TableCell>
              <TableCell>{new Date(d.dueDate).toLocaleDateString()}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    d.status === "overdue"
                      ? "bg-danger/10 text-danger"
                      : d.status === "paid"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {d.status}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">${d.balance.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Service breakdown
function ServiceBreakdown({ data }: { data: any[] }) {
  const chartData = data.map((s) => ({
    name: s.name,
    revenue: s.revenue || 0,
    target: s.monthlyTarget || 0,
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
          <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)" }} />
          <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fill: "hsl(215, 20%, 55%)" }} />
          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
          <Bar dataKey="revenue" name="Revenue" fill="hsl(160, 84%, 39%)" />
          <Bar dataKey="target" name="Target" fill="hsl(215, 20%, 55%)" />
        </BarChart>
      </ResponsiveContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => {
            const progress = s.monthlyTarget > 0 ? (s.revenue / s.monthlyTarget) * 100 : 0;
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-right">${(s.revenue || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">${(s.monthlyTarget || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={progress >= 100 ? "text-success" : progress >= 80 ? "text-warning" : "text-danger"}>
                    {progress.toFixed(0)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

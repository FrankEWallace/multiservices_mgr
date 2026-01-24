import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { expensesApi, servicesApi, Expense } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseForm, CSVImportDialog } from "@/components/forms";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { exportToCSV, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Filter, Download, Upload, Edit, Trash2, TrendingDown, TrendingUp, RefreshCw, DollarSign } from "lucide-react";

const expenseCategories = [
  { value: "operating", label: "Operating", color: "hsl(199, 89%, 48%)" },
  { value: "salaries", label: "Salaries", color: "hsl(160, 84%, 39%)" },
  { value: "utilities", label: "Utilities", color: "hsl(280, 65%, 60%)" },
  { value: "rent", label: "Rent", color: "hsl(45, 93%, 47%)" },
  { value: "supplies", label: "Supplies", color: "hsl(38, 92%, 50%)" },
  { value: "marketing", label: "Marketing", color: "hsl(220, 9%, 46%)" },
  { value: "maintenance", label: "Maintenance", color: "hsl(0, 84%, 60%)" },
  { value: "transport", label: "Transport", color: "hsl(180, 70%, 45%)" },
  { value: "insurance", label: "Insurance", color: "hsl(300, 60%, 50%)" },
  { value: "taxes", label: "Taxes", color: "hsl(120, 50%, 40%)" },
  { value: "other", label: "Other", color: "hsl(240, 30%, 50%)" },
];

const expenseExportColumns = [
  { key: "date", header: "Date", formatter: (v: unknown) => new Date(v as string).toLocaleDateString() },
  { key: "serviceName", header: "Service" },
  { key: "category", header: "Category" },
  { key: "vendor", header: "Vendor" },
  { key: "description", header: "Description" },
  { key: "amount", header: "Amount", formatter: (v: unknown) => `$${(v as number)?.toLocaleString() || 0}` },
  { key: "isRecurring", header: "Recurring", formatter: (v: unknown) => (v as boolean) ? "Yes" : "No" },
];

const Expenses = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.getAll(200),
    staleTime: 30000,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["expenses", "summary"],
    queryFn: expensesApi.getSummary,
    staleTime: 30000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
    staleTime: 60000,
  });

  const expenses = expensesData?.expenses || [];
  const summary = summaryData?.summary;
  const services = servicesData?.services || [];

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchesService = serviceFilter === "all" || 
      (serviceFilter === "general" ? !e.serviceId : e.serviceId?.toString() === serviceFilter);
    const matchesSearch = !searchTerm || 
      e.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesService && matchesSearch;
  });

  // Prepare pie chart data
  const pieData = summary?.byCategory?.map((cat) => ({
    name: expenseCategories.find((c) => c.value === cat.category)?.label || cat.category,
    value: cat.total,
    color: expenseCategories.find((c) => c.value === cat.category)?.color || "hsl(220, 9%, 46%)",
  })) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingExpense) {
      deleteMutation.mutate(deletingExpense.id);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingExpense(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredExpenses, expenseExportColumns, `expenses_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const summaryItems = generateSummaryHTML([
      { label: "Today", value: `$${summary?.today?.toLocaleString() || 0}` },
      { label: "This Month", value: `$${summary?.thisMonth?.toLocaleString() || 0}`, type: summary?.changePercent && summary.changePercent > 0 ? "danger" : "success" },
      { label: "Change", value: `${summary?.changePercent || 0}%`, type: summary?.changePercent && summary.changePercent > 0 ? "danger" : "success" },
      { label: "Recurring", value: `$${summary?.recurring?.total?.toLocaleString() || 0}` },
    ]);
    const table = generateTableHTML(filteredExpenses.slice(0, 100), expenseExportColumns);
    exportToPDF("Expense Report", `<h2>Summary</h2>${summaryItems}<h2>Expenses</h2>${table}`, "expense_report");
  };

  const isLoading = expensesLoading || summaryLoading;

  return (
    <DashboardLayout>
      <ExpenseForm open={formOpen} onOpenChange={handleFormClose} expense={editingExpense} />
      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="expense"
        importFn={expensesApi.bulkImport}
      />
      <DeleteConfirmation
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Expense"
        description={`This will permanently delete the expense of $${deletingExpense?.amount?.toLocaleString() || 0} from ${deletingExpense?.vendor || "Unknown vendor"}.`}
        isLoading={deleteMutation.isPending}
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Management</h1>
            <p className="text-muted-foreground">Track and manage business expenses</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${summary?.today?.toLocaleString() || 0}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-danger" />
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${summary?.thisMonth?.toLocaleString() || 0}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                {summary?.changePercent && summary.changePercent > 0 ? (
                  <TrendingUp className="w-4 h-4 text-danger" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
                <p className="text-sm text-muted-foreground">vs Last Month</p>
              </div>
              <p className={`text-2xl font-bold ${summary?.changePercent && summary.changePercent > 0 ? "text-danger" : "text-success"}`}>
                {summary?.changePercent && summary.changePercent > 0 ? "+" : ""}
                {summary?.changePercent?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-warning" />
                <p className="text-sm text-muted-foreground">Recurring</p>
              </div>
              <p className="text-2xl font-bold text-warning">
                ${summary?.recurring?.total?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">{summary?.recurring?.count || 0} items</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-2">This Year</p>
              <p className="text-2xl font-bold text-foreground">
                ${summary?.thisYear?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

        {/* Category Breakdown & Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Pie Chart */}
          <div className="glass-card p-4 lg:col-span-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Expenses by Category</h3>
            {pieData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No expense data
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 lg:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Filters</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-secondary">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40 bg-secondary">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="general">General (No Service)</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search vendor, description..."
                className="w-60 bg-secondary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="glass-card overflow-hidden">
          {expensesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No expenses found
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Service</th>
                  <th>Vendor</th>
                  <th>Description</th>
                  <th className="text-center">Recurring</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.slice(0, 50).map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td>
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: `${expenseCategories.find((c) => c.value === expense.category)?.color || "gray"}20`,
                          color: expenseCategories.find((c) => c.value === expense.category)?.color || "gray",
                        }}
                      >
                        {expenseCategories.find((c) => c.value === expense.category)?.label || expense.category}
                      </span>
                    </td>
                    <td>{expense.serviceName || "General"}</td>
                    <td>{expense.vendor || "-"}</td>
                    <td className="text-muted-foreground max-w-xs truncate">
                      {expense.description || "-"}
                    </td>
                    <td className="text-center">
                      {expense.isRecurring && (
                        <RefreshCw className="w-4 h-4 text-warning mx-auto" />
                      )}
                    </td>
                    <td className="text-right font-medium text-danger">
                      -${expense.amount.toLocaleString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Expenses;

import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { revenueApi, servicesApi, Revenue as RevenueType } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueForm } from "@/components/forms";
import { exportToCSV, revenueExportColumns, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
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
import { Plus, Filter, Download, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

const Revenue = () => {
  const [serviceFilter, setServiceFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RevenueType | null>(null);

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue"],
    queryFn: () => revenueApi.getAll(100),
    staleTime: 30000,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["revenue", "summary"],
    queryFn: revenueApi.getSummary,
    staleTime: 30000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
    staleTime: 60000,
  });

  const revenues = revenueData?.revenues || [];
  const summary = summaryData?.summary;
  const services = servicesData?.services || [];

  // Filter revenues
  const filteredRevenues =
    serviceFilter === "all"
      ? revenues
      : revenues.filter((r) => r.serviceName?.toLowerCase() === serviceFilter);

  const handleEdit = (entry: RevenueType) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingEntry(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredRevenues, revenueExportColumns, `revenue_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const summaryItems = generateSummaryHTML([
      { label: "Today", value: `$${summary?.today?.toLocaleString() || 0}`, type: "success" },
      { label: "This Month", value: `$${summary?.thisMonth?.toLocaleString() || 0}` },
      { label: "This Year", value: `$${summary?.thisYear?.toLocaleString() || 0}` },
      { label: "Entries", value: filteredRevenues.length },
    ]);
    const table = generateTableHTML(filteredRevenues.slice(0, 100), revenueExportColumns);
    exportToPDF("Revenue Report", `<h2>Summary</h2>${summaryItems}<h2>Transactions</h2>${table}`, "revenue_report");
  };

  return (
    <DashboardLayout>
      <RevenueForm open={formOpen} onOpenChange={handleFormClose} revenue={editingEntry} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Revenue Tracking
            </h1>
            <p className="text-muted-foreground">
              Manage daily revenue entries and tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Today's Revenue</p>
              <p className="text-2xl font-bold text-success">
                ${summary?.today?.toLocaleString() || 0}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground">
                ${summary?.thisMonth?.toLocaleString() || 0}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">This Year</p>
              <p className="text-2xl font-bold text-foreground">
                ${summary?.thisYear?.toLocaleString() || 0}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold text-primary">
                {revenues.length}
              </p>
            </div>
          </div>
        )}

        {/* Payment Method Breakdown */}
        {summary?.byPaymentMethod && summary.byPaymentMethod.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              This Month by Payment Method
            </h3>
            <div className="flex gap-6">
              {summary.byPaymentMethod.map((pm) => (
                <div key={pm.method} className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    ${pm.total?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {pm.method} ({pm.count})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select
              value={serviceFilter}
              onValueChange={setServiceFilter}
              defaultValue="all"
            >
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.name.toLowerCase()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {revenueLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRevenues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No revenue entries found
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Payment Method</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenues.slice(0, 50).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.serviceName || "Unknown"}</td>
                    <td className="text-muted-foreground max-w-xs truncate">
                      {entry.description || "-"}
                    </td>
                    <td>
                      <span className="badge-success capitalize">
                        {entry.paymentMethod}
                      </span>
                    </td>
                    <td className="text-right font-medium text-success">
                      +${entry.amount.toLocaleString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-danger transition-colors">
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

export default Revenue;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debtsApi, Debt } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtForm, PaymentForm, ReminderDialog } from "@/components/forms";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { exportToCSV, debtExportColumns, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
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
import { Plus, Filter, Download, Phone, DollarSign, Edit2, Trash2, Send } from "lucide-react";
import { useState } from "react";

const Debts = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [reminderDebt, setReminderDebt] = useState<Debt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => debtsApi.getAll(),
    staleTime: 30000,
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["debts", "aging"],
    queryFn: debtsApi.getAging,
    staleTime: 30000,
  });

  const debts = debtsData?.debts || [];
  const aging = agingData?.aging || [];
  const agingTotal = agingData?.total;

  const filteredDebts = debts.filter((d) => {
    const matchesStatus = statusFilter === "all" || d.status?.toLowerCase() === statusFilter;
    const matchesSearch = !searchTerm ||
      d.debtorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalOutstanding = debts.reduce((sum, d) => sum + d.balance, 0);

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormOpen(true);
  };

  const handlePayment = (debt: Debt) => {
    setPaymentDebt(debt);
    setPaymentFormOpen(true);
  };

  const handleReminder = (debt: Debt) => {
    setReminderDebt(debt);
    setReminderDialogOpen(true);
  };

  const handleDelete = (debt: Debt) => {
    setDeletingDebt(debt);
    setDeleteDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => debtsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Debtor deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingDebt(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete debtor");
    },
  });

  const confirmDelete = () => {
    if (deletingDebt) {
      deleteMutation.mutate(deletingDebt.id);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingDebt(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredDebts, debtExportColumns, `debts_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const overdueCount = debts.filter(d => d.status === "overdue").length;
    const summaryItems = generateSummaryHTML([
      { label: "Total Outstanding", value: `${totalOutstanding.toLocaleString()}`, type: "danger" },
      { label: "Total Debtors", value: debts.length },
      { label: "Overdue", value: overdueCount, type: overdueCount > 0 ? "danger" : "success" },
    ]);
    const table = generateTableHTML(filteredDebts, debtExportColumns);
    exportToPDF("Debt Report", `<h2>Summary</h2>${summaryItems}<h2>Debtors</h2>${table}`, "debt_report");
  };

  return (
    <DashboardLayout>
      <DebtForm open={formOpen} onOpenChange={handleFormClose} debt={editingDebt} />
      <PaymentForm open={paymentFormOpen} onOpenChange={setPaymentFormOpen} debt={paymentDebt} />
      <ReminderDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} debt={reminderDebt} />
      <DeleteConfirmation
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Debtor"
        itemName={deletingDebt?.debtorName}
        description={`This will permanently delete "${deletingDebt?.debtorName}" with a balance of ${deletingDebt?.balance?.toLocaleString() || 0}. This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Debt Management</h1>
            <p className="text-muted-foreground">Track and manage outstanding debts</p>
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
                <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Debtor
            </Button>
          </div>
        </div>

        {agingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
              <p className="text-3xl font-bold text-foreground">{totalOutstanding.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">{agingTotal?.count || debts.length} debtors</p>
            </div>
            {aging.map((item, index) => (
              <div
                key={index}
                className={`glass-card p-4 border-l-4 ${
                  item.color === "success" ? "border-l-success" :
                  item.color === "warning" ? "border-l-warning" :
                  item.color === "orange" ? "border-l-orange-500" : "border-l-danger"
                }`}
              >
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${
                  item.color === "success" ? "text-success" :
                  item.color === "warning" ? "text-warning" :
                  item.color === "orange" ? "text-orange-500" : "text-danger"
                }`}>
                  {(item.amount || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{item.count || 0} debtors</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search debtor..."
              className="w-60 bg-secondary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {debtsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No debtors found</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Debtor</th>
                  <th>Service</th>
                  <th className="text-right">Original</th>
                  <th className="text-right">Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.map((debtor) => (
                  <tr key={debtor.id}>
                    <td>
                      <div>
                        <p className="font-medium">{debtor.debtorName}</p>
                        <p className="text-xs text-muted-foreground">{debtor.debtorContact || "-"}</p>
                      </div>
                    </td>
                    <td>{debtor.serviceName || "Unknown"}</td>
                    <td className="text-right text-muted-foreground">{debtor.originalAmount.toLocaleString()}</td>
                    <td className="text-right font-semibold text-danger">{debtor.balance.toLocaleString()}</td>
                    <td>{debtor.dueDate}</td>
                    <td>
                      <span className={
                        debtor.status === "overdue" ? "badge-danger" :
                        debtor.status === "pending" ? "badge-warning" :
                        debtor.status === "paid" ? "badge-success" : "badge-success"
                      }>
                        {debtor.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {debtor.balance > 0 && (
                          <>
                            <button
                              onClick={() => handlePayment(debtor)}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-success transition-colors"
                              title="Record Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReminder(debtor)}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                              title="Send Reminder"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(debtor)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(debtor)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-danger transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {debtor.debtorContact && (
                          <a
                            href={`tel:${debtor.debtorContact}`}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
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

export default Debts;

import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { madeniApi, Madeni as MadeniType } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { MadeniForm, PaymentForm } from "@/components/forms";
import { exportToCSV, madeniExportColumns, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
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
import { Plus, Filter, Download, Phone, DollarSign, Edit2 } from "lucide-react";
import { useState } from "react";

const Madeni = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingMadeni, setEditingMadeni] = useState<MadeniType | null>(null);
  const [paymentMadeni, setPaymentMadeni] = useState<MadeniType | null>(null);

  const { data: madeniData, isLoading: madeniLoading } = useQuery({
    queryKey: ["madeni"],
    queryFn: () => madeniApi.getAll(),
    staleTime: 30000,
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["madeni", "aging"],
    queryFn: madeniApi.getAging,
    staleTime: 30000,
  });

  const madenis = madeniData?.madenis || [];
  const aging = agingData?.aging || [];
  const agingTotal = agingData?.total;

  const filteredMadenis = madenis.filter((m) => {
    const matchesStatus = statusFilter === "all" || m.status?.toLowerCase() === statusFilter;
    const matchesSearch = !searchTerm || 
      m.debtorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalOutstanding = madenis.reduce((sum, m) => sum + m.balance, 0);

  const handleEdit = (madeni: MadeniType) => {
    setEditingMadeni(madeni);
    setFormOpen(true);
  };

  const handlePayment = (madeni: MadeniType) => {
    setPaymentMadeni(madeni);
    setPaymentFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingMadeni(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredMadenis, madeniExportColumns, `madeni_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const overdueCount = madenis.filter(m => m.status === "overdue").length;
    const summaryItems = generateSummaryHTML([
      { label: "Total Outstanding", value: `$${totalOutstanding.toLocaleString()}`, type: "danger" },
      { label: "Total Debtors", value: madenis.length },
      { label: "Overdue", value: overdueCount, type: overdueCount > 0 ? "danger" : "success" },
    ]);
    const table = generateTableHTML(filteredMadenis, madeniExportColumns);
    exportToPDF("Debt Report (Madeni)", `<h2>Summary</h2>${summaryItems}<h2>Debtors</h2>${table}`, "madeni_report");
  };

  return (
    <DashboardLayout>
      <MadeniForm open={formOpen} onOpenChange={handleFormClose} madeni={editingMadeni} />
      <PaymentForm open={paymentFormOpen} onOpenChange={setPaymentFormOpen} madeni={paymentMadeni} />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Madeni (Debt Management)</h1>
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
              <p className="text-3xl font-bold text-foreground">${totalOutstanding.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">{agingTotal?.count || madenis.length} debtors</p>
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
                  ${(item.amount || 0).toLocaleString()}
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
          {madeniLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredMadenis.length === 0 ? (
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
                {filteredMadenis.map((debtor) => (
                  <tr key={debtor.id}>
                    <td>
                      <div>
                        <p className="font-medium">{debtor.debtorName}</p>
                        <p className="text-xs text-muted-foreground">{debtor.debtorContact || "-"}</p>
                      </div>
                    </td>
                    <td>{debtor.serviceName || "Unknown"}</td>
                    <td className="text-right text-muted-foreground">${debtor.originalAmount.toLocaleString()}</td>
                    <td className="text-right font-semibold text-danger">${debtor.balance.toLocaleString()}</td>
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
                          <button
                            onClick={() => handlePayment(debtor)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-success transition-colors"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(debtor)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {debtor.debtorContact && (
                          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Call">
                            <Phone className="w-4 h-4" />
                          </button>
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

export default Madeni;

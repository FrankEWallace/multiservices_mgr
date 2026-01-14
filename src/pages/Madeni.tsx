import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Download, Eye, Phone, Mail } from "lucide-react";

const debtors = [
  {
    id: 1,
    name: "ABC Corporation",
    service: "Transport",
    amount: 4200,
    dueDate: "2024-01-10",
    daysOverdue: 75,
    status: "Overdue",
    contact: "+255 755 123 456",
  },
  {
    id: 2,
    name: "XYZ Holdings Ltd",
    service: "Logistics",
    amount: 3100,
    dueDate: "2024-01-20",
    daysOverdue: 45,
    status: "Overdue",
    contact: "+255 755 234 567",
  },
  {
    id: 3,
    name: "Prime Industries",
    service: "Real Estate",
    amount: 2800,
    dueDate: "2024-02-01",
    daysOverdue: 32,
    status: "Overdue",
    contact: "+255 755 345 678",
  },
  {
    id: 4,
    name: "Global Trading Co",
    service: "Agriculture",
    amount: 5500,
    dueDate: "2024-02-15",
    daysOverdue: 18,
    status: "Pending",
    contact: "+255 755 456 789",
  },
  {
    id: 5,
    name: "Metro Services",
    service: "Transport",
    amount: 1800,
    dueDate: "2024-02-20",
    daysOverdue: 12,
    status: "Pending",
    contact: "+255 755 567 890",
  },
  {
    id: 6,
    name: "City Builders Inc",
    service: "Construction",
    amount: 7200,
    dueDate: "2024-02-28",
    daysOverdue: 0,
    status: "Current",
    contact: "+255 755 678 901",
  },
];

const agingSummary = [
  { label: "Current (0-30)", amount: 18500, count: 8, color: "success" },
  { label: "31-60 Days", amount: 12400, count: 5, color: "warning" },
  { label: "60+ Days", amount: 8200, count: 3, color: "danger" },
];

const Madeni = () => {
  const totalMadeni = agingSummary.reduce((sum, s) => sum + s.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Madeni (Debt Management)</h1>
            <p className="text-muted-foreground">Track and manage outstanding debts</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Debtor
            </Button>
          </div>
        </div>

        {/* Aging Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 col-span-1">
            <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
            <p className="text-3xl font-bold text-foreground">${totalMadeni.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">16 debtors</p>
          </div>
          {agingSummary.map((item, index) => (
            <div
              key={index}
              className={`glass-card p-4 border-l-4 ${
                item.color === "success"
                  ? "border-l-success"
                  : item.color === "warning"
                  ? "border-l-warning"
                  : "border-l-danger"
              }`}
            >
              <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
              <p className={`text-2xl font-bold text-${item.color}`}>
                ${item.amount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{item.count} debtors</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="real-estate">Real Estate</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Aging" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aging</SelectItem>
                <SelectItem value="0-30">0-30 Days</SelectItem>
                <SelectItem value="31-60">31-60 Days</SelectItem>
                <SelectItem value="60+">60+ Days</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Search debtor..." className="w-60 bg-secondary" />
          </div>
        </div>

        {/* Debtors Table */}
        <div className="glass-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Debtor</th>
                <th>Service</th>
                <th className="text-right">Amount</th>
                <th>Due Date</th>
                <th>Aging</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((debtor) => (
                <tr key={debtor.id}>
                  <td>
                    <div>
                      <p className="font-medium">{debtor.name}</p>
                      <p className="text-xs text-muted-foreground">{debtor.contact}</p>
                    </div>
                  </td>
                  <td>{debtor.service}</td>
                  <td className="text-right font-semibold">${debtor.amount.toLocaleString()}</td>
                  <td>{debtor.dueDate}</td>
                  <td>
                    <span
                      className={
                        debtor.daysOverdue > 60
                          ? "badge-danger"
                          : debtor.daysOverdue > 30
                          ? "badge-warning"
                          : "badge-success"
                      }
                    >
                      {debtor.daysOverdue} days
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        debtor.status === "Overdue"
                          ? "badge-danger"
                          : debtor.status === "Pending"
                          ? "badge-warning"
                          : "badge-success"
                      }
                    >
                      {debtor.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Madeni;

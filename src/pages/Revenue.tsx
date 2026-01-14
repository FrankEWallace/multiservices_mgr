import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Download, Edit, Trash2 } from "lucide-react";

const revenueEntries = [
  { id: 1, date: "2024-01-15", service: "Transport", type: "Revenue", amount: 4500, description: "Client A delivery" },
  { id: 2, date: "2024-01-15", service: "Logistics", type: "Revenue", amount: 3200, description: "Warehouse services" },
  { id: 3, date: "2024-01-14", service: "Transport", type: "Fixed Cost", amount: -1200, description: "Vehicle maintenance" },
  { id: 4, date: "2024-01-14", service: "Real Estate", type: "Revenue", amount: 8500, description: "Property rental" },
  { id: 5, date: "2024-01-13", service: "Agriculture", type: "Variable Cost", amount: -800, description: "Supplies purchase" },
  { id: 6, date: "2024-01-13", service: "Retail", type: "Revenue", amount: 2100, description: "Daily sales" },
];

const Revenue = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue & Costs</h1>
            <p className="text-muted-foreground">Manage daily revenue entries and cost tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-success">$18,300</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Fixed Costs</p>
            <p className="text-2xl font-bold text-foreground">$4,200</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Variable Costs</p>
            <p className="text-2xl font-bold text-foreground">$2,800</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Net Profit</p>
            <p className="text-2xl font-bold text-primary">$11,300</p>
          </div>
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
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="fixed">Fixed Cost</SelectItem>
                <SelectItem value="variable">Variable Cost</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-40 bg-secondary" />
            <Input type="date" className="w-40 bg-secondary" />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {revenueEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>{entry.service}</td>
                  <td>
                    <span
                      className={
                        entry.type === "Revenue"
                          ? "badge-success"
                          : entry.type === "Fixed Cost"
                          ? "badge-warning"
                          : "badge-danger"
                      }
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{entry.description}</td>
                  <td className={`text-right font-medium ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>
                    {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toLocaleString()}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Revenue;

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, BarChart2, PieChart, TrendingUp } from "lucide-react";

const reports = [
  {
    name: "Monthly Financial Summary",
    description: "Complete revenue, costs, and profit analysis",
    type: "Financial",
    lastGenerated: "2024-01-14",
    icon: BarChart2,
  },
  {
    name: "Service Performance Report",
    description: "Individual service metrics and KPIs",
    type: "Performance",
    lastGenerated: "2024-01-13",
    icon: PieChart,
  },
  {
    name: "Madeni Aging Report",
    description: "Outstanding debts by aging category",
    type: "Collections",
    lastGenerated: "2024-01-14",
    icon: Calendar,
  },
  {
    name: "Goal Achievement Analysis",
    description: "Daily targets vs actual performance",
    type: "Goals",
    lastGenerated: "2024-01-12",
    icon: TrendingUp,
  },
  {
    name: "Quarterly Business Review",
    description: "Executive summary with projections",
    type: "Executive",
    lastGenerated: "2024-01-01",
    icon: FileText,
  },
];

const Reports = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Generate and download business reports</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <FileText className="w-4 h-4" />
            Create Custom Report
          </Button>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, index) => (
            <div key={index} className="glass-card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <report.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  {report.type}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{report.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Last: {report.lastGenerated}
                </span>
                <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">Report Generation Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Reports This Month</p>
              <p className="text-2xl font-bold text-foreground">24</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Requested</p>
              <p className="text-2xl font-bold text-foreground">Financial</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Generation Time</p>
              <p className="text-2xl font-bold text-foreground">2.3s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Coverage</p>
              <p className="text-2xl font-bold text-success">100%</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

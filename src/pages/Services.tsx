import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { servicesApi, ServiceWithStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ServiceForm } from "@/components/forms";
import { exportToCSV, serviceExportColumns, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
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
import { Building2, Truck, Package, Home, Wheat, ShoppingCart, Hammer, Plus, Download, Edit2 } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  truck: <Truck className="w-5 h-5 text-primary" />,
  package: <Package className="w-5 h-5 text-primary" />,
  building: <Home className="w-5 h-5 text-primary" />,
  wheat: <Wheat className="w-5 h-5 text-primary" />,
  "shopping-cart": <ShoppingCart className="w-5 h-5 text-primary" />,
  hammer: <Hammer className="w-5 h-5 text-primary" />,
};

const colorMap: Record<string, string> = {
  blue: "hsl(199, 89%, 48%)",
  green: "hsl(160, 84%, 39%)",
  purple: "hsl(280, 65%, 60%)",
  yellow: "hsl(45, 93%, 47%)",
  orange: "hsl(38, 92%, 50%)",
  gray: "hsl(220, 9%, 46%)",
};

const Services = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithStats | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
    staleTime: 60000,
  });

  const services = data?.services || [];

  // Calculate totals for pie chart
  const revenueByService = services.map((s) => ({
    name: s.name,
    value: s.revenue,
    color: colorMap[s.color] || colorMap.blue,
  }));

  const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = services.reduce((sum, s) => sum + s.profit, 0);

  const handleEdit = (service: ServiceWithStats) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingService(null);
  };

  const handleExportCSV = () => {
    exportToCSV(services, serviceExportColumns, `services_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const summary = generateSummaryHTML([
      { label: "Total Services", value: services.length },
      { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
      { label: "Total Profit", value: `$${totalProfit.toLocaleString()}`, type: "success" },
      { label: "On Track", value: services.filter(s => s.goalMet).length, type: "success" },
    ]);
    const table = generateTableHTML(services, serviceExportColumns);
    exportToPDF("Service Performance Report", `<h2>Summary</h2>${summary}<h2>Services</h2>${table}`, "services_report");
  };

  return (
    <DashboardLayout>
      <ServiceForm open={formOpen} onOpenChange={handleFormClose} service={editingService} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Performance</h1>
            <p className="text-muted-foreground">Monitor individual service metrics and KPIs</p>
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
              Add Service
            </Button>
          </div>
        </div>

        {/* Service Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="glass-card p-6 hover:bg-card-hover transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      {iconMap[service.icon] || <Building2 className="w-5 h-5 text-primary" />}
                    </div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={service.goalMet ? "badge-success" : "badge-warning"}>
                      {service.goalMet ? "On Track" : "Below Target"}
                    </span>
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit Service"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Revenue</p>
                    <p className="text-lg font-bold text-foreground">
                      ${service.revenue >= 1000 ? `${(service.revenue / 1000).toFixed(1)}k` : service.revenue}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Profit</p>
                    <p className="text-lg font-bold text-success">
                      ${service.profit >= 1000 ? `${(service.profit / 1000).toFixed(1)}k` : service.profit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Margin</p>
                    <p className="text-lg font-bold text-foreground">{service.margin}%</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Monthly Target: ${service.monthlyTarget?.toLocaleString() || 0}</span>
                    <span>{service.monthlyTarget ? Math.round((service.revenue / service.monthlyTarget) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`h-full rounded-full ${service.goalMet ? "bg-success" : "bg-warning"}`}
                      style={{ width: `${Math.min((service.revenue / (service.monthlyTarget || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Distribution */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Revenue Distribution</h3>
            {isLoading ? (
              <Skeleton className="w-full h-[85%]" />
            ) : (
              <div className="flex items-center h-[85%]">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByService}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {revenueByService.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(222, 47%, 16%)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {revenueByService.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profit Summary */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Profit by Service</h3>
            {isLoading ? (
              <Skeleton className="w-full h-[85%]" />
            ) : (
              <div className="space-y-3 overflow-y-auto h-[85%] pr-2">
                {services
                  .sort((a, b) => b.profit - a.profit)
                  .map((service) => (
                    <div key={service.id} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-muted-foreground truncate">{service.name}</div>
                      <div className="flex-1">
                        <div className="h-6 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(service.profit / (totalProfit || 1)) * 100}%`,
                              backgroundColor: colorMap[service.color] || colorMap.blue,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm font-medium">
                        ${service.profit >= 1000 ? `${(service.profit / 1000).toFixed(1)}k` : service.profit}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Services;

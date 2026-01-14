import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp, Target, Calendar, Activity } from "lucide-react";

const quarterlyData = [
  { quarter: "Q1", target: 85000, actual: 78500, projected: 82000 },
  { quarter: "Q2", target: 92000, actual: 88200, projected: 90500 },
  { quarter: "Q3", target: 98000, actual: 95400, projected: 97000 },
  { quarter: "Q4", target: 105000, actual: null, projected: 102000 },
];

const monthlyForecast = [
  { month: "Jan", actual: 24500, forecast: 24000 },
  { month: "Feb", actual: 26800, forecast: 25500 },
  { month: "Mar", actual: 27200, forecast: 26000 },
  { month: "Apr", actual: 29100, forecast: 28000 },
  { month: "May", actual: 30500, forecast: 29500 },
  { month: "Jun", actual: 28800, forecast: 30000 },
  { month: "Jul", actual: null, forecast: 31000 },
  { month: "Aug", actual: null, forecast: 32000 },
  { month: "Sep", actual: null, forecast: 32500 },
];

const activities = [
  { name: "Fleet Expansion", investment: 25000, expectedROI: 15, status: "In Progress" },
  { name: "Warehouse Automation", investment: 45000, expectedROI: 22, status: "Planned" },
  { name: "New Market Entry", investment: 35000, expectedROI: 18, status: "Under Review" },
  { name: "Digital Platform", investment: 15000, expectedROI: 28, status: "Completed" },
];

const Projections = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projections & Planning</h1>
            <p className="text-muted-foreground">Quarterly targets, forecasts, and strategic activities</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="kpi-card kpi-card-success">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="stat-label">Annual Target</span>
            </div>
            <p className="stat-value">$380,000</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="stat-label">YTD Actual</span>
            </div>
            <p className="stat-value">$262,100</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="stat-label">YTD Forecast</span>
            </div>
            <p className="stat-value">$269,500</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-warning" />
              <span className="stat-label">Variance</span>
            </div>
            <p className="stat-value text-warning">-2.7%</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quarterly Performance */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Quarterly Performance</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                <XAxis
                  dataKey="quarter"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => `$${value?.toLocaleString() || 'N/A'}`}
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(222, 47%, 16%)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="target" fill="hsl(222, 47%, 25%)" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="actual" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Actual" />
                <Bar dataKey="projected" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Projected" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Forecast */}
          <div className="chart-container h-80">
            <h3 className="section-title mb-4">Monthly Forecast vs Actual</h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={monthlyForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => `$${value?.toLocaleString() || 'N/A'}`}
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(222, 47%, 16%)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(160, 84%, 39%)", r: 4 }}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="hsl(199, 89%, 48%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(199, 89%, 48%)", r: 4 }}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activities & ROI */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="section-title">Strategic Activities & ROI</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th className="text-right">Investment</th>
                <th className="text-right">Expected ROI</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => (
                <tr key={index}>
                  <td className="font-medium">{activity.name}</td>
                  <td className="text-right">${activity.investment.toLocaleString()}</td>
                  <td className="text-right text-success font-medium">{activity.expectedROI}%</td>
                  <td>
                    <span
                      className={
                        activity.status === "Completed"
                          ? "badge-success"
                          : activity.status === "In Progress"
                          ? "badge-warning"
                          : "badge-danger"
                      }
                    >
                      {activity.status}
                    </span>
                  </td>
                  <td>
                    <div className="progress-bar w-32">
                      <div
                        className={`h-full rounded-full ${
                          activity.status === "Completed"
                            ? "bg-success"
                            : activity.status === "In Progress"
                            ? "bg-warning"
                            : "bg-muted"
                        }`}
                        style={{
                          width:
                            activity.status === "Completed"
                              ? "100%"
                              : activity.status === "In Progress"
                              ? "60%"
                              : "20%",
                        }}
                      />
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

export default Projections;

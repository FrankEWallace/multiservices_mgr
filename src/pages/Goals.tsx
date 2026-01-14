import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Target, TrendingUp, Calendar } from "lucide-react";

const serviceGoals = [
  { service: "Transport", dailyTarget: 4500, actual: 5200, daysMetThisMonth: 18, totalDays: 22 },
  { service: "Logistics", dailyTarget: 3800, actual: 3400, daysMetThisMonth: 14, totalDays: 22 },
  { service: "Real Estate", dailyTarget: 3200, actual: 3500, daysMetThisMonth: 16, totalDays: 22 },
  { service: "Agriculture", dailyTarget: 2500, actual: 2100, daysMetThisMonth: 12, totalDays: 22 },
  { service: "Retail", dailyTarget: 2200, actual: 2400, daysMetThisMonth: 17, totalDays: 22 },
  { service: "Construction", dailyTarget: 1800, actual: 1650, daysMetThisMonth: 10, totalDays: 22 },
];

const weeklyProgress = [
  { day: "Mon", met: true },
  { day: "Tue", met: true },
  { day: "Wed", met: false },
  { day: "Thu", met: true },
  { day: "Fri", met: true },
  { day: "Sat", met: false },
  { day: "Sun", met: true },
];

const Goals = () => {
  const totalTarget = serviceGoals.reduce((sum, g) => sum + g.dailyTarget, 0);
  const totalActual = serviceGoals.reduce((sum, g) => sum + g.actual, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Goals & Performance</h1>
            <p className="text-muted-foreground">Track daily targets and achievement consistency</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Target className="w-4 h-4" />
            Set New Targets
          </Button>
        </div>

        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="kpi-card kpi-card-success">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="stat-label">Daily Target</span>
            </div>
            <p className="stat-value">${totalTarget.toLocaleString()}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="stat-label">Today's Actual</span>
            </div>
            <p className="stat-value">${totalActual.toLocaleString()}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="stat-label">Achievement</span>
            </div>
            <p className="stat-value">{((totalActual / totalTarget) * 100).toFixed(1)}%</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="stat-label">Days Met (Month)</span>
            </div>
            <p className="stat-value">15/22</p>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">This Week's Progress</h3>
          <div className="flex items-center justify-between gap-4">
            {weeklyProgress.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <div
                  className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    day.met ? "bg-success/20" : "bg-danger/20"
                  }`}
                >
                  {day.met ? (
                    <CheckCircle className="w-6 h-6 text-success" />
                  ) : (
                    <XCircle className="w-6 h-6 text-danger" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Goals Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="section-title">Daily Targets by Service</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th className="text-right">Daily Target</th>
                <th className="text-right">Today's Actual</th>
                <th className="text-right">Variance</th>
                <th className="text-center">Status</th>
                <th>Consistency</th>
              </tr>
            </thead>
            <tbody>
              {serviceGoals.map((goal) => {
                const variance = goal.actual - goal.dailyTarget;
                const variancePercent = ((variance / goal.dailyTarget) * 100).toFixed(1);
                const isMet = goal.actual >= goal.dailyTarget;
                const consistency = (goal.daysMetThisMonth / goal.totalDays) * 100;

                return (
                  <tr key={goal.service}>
                    <td className="font-medium">{goal.service}</td>
                    <td className="text-right">${goal.dailyTarget.toLocaleString()}</td>
                    <td className="text-right font-medium">${goal.actual.toLocaleString()}</td>
                    <td className={`text-right ${variance >= 0 ? "text-success" : "text-danger"}`}>
                      {variance >= 0 ? "+" : ""}${variance.toLocaleString()} ({variancePercent}%)
                    </td>
                    <td className="text-center">
                      {isMet ? (
                        <span className="badge-success">Met</span>
                      ) : (
                        <span className="badge-danger">Not Met</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 progress-bar">
                          <div
                            className={`h-full rounded-full ${
                              consistency >= 70 ? "bg-success" : consistency >= 50 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${consistency}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12">
                          {goal.daysMetThisMonth}/{goal.totalDays}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Goals;

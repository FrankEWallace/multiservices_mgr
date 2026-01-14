import { Target, CheckCircle, XCircle } from "lucide-react";

const dailyGoals = [
  { service: "Transport", target: 4500, actual: 5200, met: true },
  { service: "Logistics", target: 3800, actual: 3400, met: false },
  { service: "Real Estate", target: 3200, actual: 3500, met: true },
  { service: "Agriculture", target: 2500, actual: 2100, met: false },
  { service: "Retail", target: 2200, actual: 2400, met: true },
  { service: "Construction", target: 1800, actual: 1650, met: false },
];

export function GoalProgress() {
  const totalTarget = dailyGoals.reduce((sum, g) => sum + g.target, 0);
  const totalActual = dailyGoals.reduce((sum, g) => sum + g.actual, 0);
  const overallProgress = (totalActual / totalTarget) * 100;
  const metCount = dailyGoals.filter((g) => g.met).length;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Daily Goal Status</h3>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {metCount}/{dailyGoals.length} Met
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Progress</span>
          <span className="text-sm font-medium text-foreground">
            ${totalActual.toLocaleString()} / ${totalTarget.toLocaleString()}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
        <p className="text-sm text-right mt-1">
          <span className={overallProgress >= 100 ? "text-success" : "text-warning"}>
            {overallProgress.toFixed(1)}%
          </span>
        </p>
      </div>

      {/* Per Service Goals */}
      <div className="space-y-3">
        {dailyGoals.map((goal, index) => {
          const progress = (goal.actual / goal.target) * 100;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{goal.service}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      ${goal.actual.toLocaleString()}
                    </span>
                    {goal.met ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger" />
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.met ? "bg-success" : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

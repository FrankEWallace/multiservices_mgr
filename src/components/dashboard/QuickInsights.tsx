import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const insights = [
  {
    type: "success",
    icon: TrendingUp,
    title: "Best Performer",
    description: "Transport service exceeded target by 14%",
    value: "+$3,500",
  },
  {
    type: "warning",
    icon: TrendingDown,
    title: "Needs Attention",
    description: "Logistics service is 7% below target",
    value: "-$1,700",
  },
  {
    type: "danger",
    icon: AlertTriangle,
    title: "Overdue Madeni",
    description: "3 payments overdue by 60+ days",
    value: "$12,400",
  },
  {
    type: "info",
    icon: Clock,
    title: "Pending Collections",
    description: "5 invoices pending this week",
    value: "$8,200",
  },
];

const alerts = [
  {
    type: "warning",
    message: "Daily goal not met for Retail service",
    time: "2 hours ago",
  },
  {
    type: "danger",
    message: "Madeni payment overdue: ABC Corp ($4,200)",
    time: "1 day ago",
  },
];

export function QuickInsights() {
  return (
    <div className="space-y-6">
      {/* Performance Insights */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Quick Insights</h3>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="insight-card">
              <div
                className={`p-2 rounded-lg ${
                  insight.type === "success"
                    ? "bg-success/20 text-success"
                    : insight.type === "warning"
                    ? "bg-warning/20 text-warning"
                    : insight.type === "danger"
                    ? "bg-danger/20 text-danger"
                    : "bg-primary/20 text-primary"
                }`}
              >
                <insight.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  insight.type === "success"
                    ? "text-success"
                    : insight.type === "warning"
                    ? "text-warning"
                    : insight.type === "danger"
                    ? "text-danger"
                    : "text-foreground"
                }`}
              >
                {insight.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`alert-card ${
                alert.type === "warning" ? "alert-card-warning" : "alert-card-danger"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 ${
                  alert.type === "warning" ? "text-warning" : "text-danger"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

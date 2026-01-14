import { CreditCard, AlertTriangle, Clock, CheckCircle } from "lucide-react";

const madeniStats = [
  { label: "0-30 Days", amount: 18500, count: 8, status: "current" },
  { label: "31-60 Days", amount: 12400, count: 5, status: "warning" },
  { label: "60+ Days", amount: 8200, count: 3, status: "overdue" },
];

const recentMadeni = [
  { debtor: "ABC Corporation", amount: 4200, days: 75, service: "Transport" },
  { debtor: "XYZ Holdings", amount: 3100, days: 45, service: "Logistics" },
  { debtor: "Prime Industries", amount: 2800, days: 32, service: "Real Estate" },
];

export function MadeniSummary() {
  const totalMadeni = madeniStats.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Madeni Overview</h3>
        <span className="text-lg font-bold text-foreground">
          ${totalMadeni.toLocaleString()}
        </span>
      </div>

      {/* Aging Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {madeniStats.map((stat, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-center ${
              stat.status === "current"
                ? "bg-success/10 border border-success/20"
                : stat.status === "warning"
                ? "bg-warning/10 border border-warning/20"
                : "bg-danger/10 border border-danger/20"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p
              className={`text-lg font-bold ${
                stat.status === "current"
                  ? "text-success"
                  : stat.status === "warning"
                  ? "text-warning"
                  : "text-danger"
              }`}
            >
              ${(stat.amount / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground">{stat.count} items</p>
          </div>
        ))}
      </div>

      {/* Top Overdue */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Top Overdue</p>
        <div className="space-y-2">
          {recentMadeni.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{item.debtor}</p>
                <p className="text-xs text-muted-foreground">{item.service}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-danger">
                  ${item.amount.toLocaleString()}
                </p>
                <span
                  className={`text-xs ${
                    item.days > 60
                      ? "badge-danger"
                      : item.days > 30
                      ? "badge-warning"
                      : "badge-success"
                  }`}
                >
                  {item.days} days
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  variant = "default",
  icon,
}: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;

  const variantClasses = {
    default: "kpi-card",
    success: "kpi-card kpi-card-success",
    warning: "kpi-card kpi-card-warning",
    danger: "kpi-card kpi-card-danger",
  };

  return (
    <div className={cn(variantClasses[variant], "animate-fade-in")}>
      <div className="flex items-start justify-between mb-4">
        <span className="stat-label">{title}</span>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      <div className="stat-value mb-2">{value}</div>
      {change !== undefined && (
        <div className={isPositive ? "stat-change-positive" : "stat-change-negative"}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
          <span className="text-muted-foreground ml-1">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

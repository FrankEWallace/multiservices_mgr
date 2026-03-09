import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  /** Compact horizontal layout for the KPI strip */
  compact?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  variant = "default",
  icon,
  compact = false,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNeutral = change !== undefined && change === 0;
  const isNegative = change !== undefined && change < 0;

  const trendColor = isPositive
    ? "text-emerald-500"
    : isNegative
    ? "text-red-400"
    : "text-muted-foreground";

  const accentBar = {
    default: "bg-border",
    success: "bg-emerald-500",
    warning: "bg-amber-400",
    danger: "bg-red-400",
  }[variant];

  if (compact) {
    // Horizontal strip tile — used in the 3-across KPI row
    return (
      <div
        className={cn(
          "kpi-card group cursor-pointer touch-manipulation select-none",
          "flex flex-col justify-between",
        )}
        style={{ minHeight: 0 }}
      >
        {/* Accent line top */}
        <div className={cn("absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl", accentBar)} />

        <div className="flex items-center justify-between mb-3">
          <span
            className="text-muted-foreground font-medium uppercase"
            style={{ fontSize: "0.65rem", letterSpacing: "0.09em" }}
          >
            {title}
          </span>
          {icon && (
            <span className={cn("opacity-30 group-hover:opacity-60 transition-opacity", trendColor)}>
              {icon}
            </span>
          )}
        </div>

        <div
          className="text-foreground font-bold leading-none"
          style={{ fontSize: "1.55rem", letterSpacing: "-0.03em" }}
        >
          {value}
        </div>

        {change !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2.5", trendColor)}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <Minus className="w-3 h-3" strokeWidth={2.5} />
            )}
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>
              {isPositive ? "+" : ""}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              {changeLabel}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full-size fallback (unchanged behaviour for other pages)
  return (
    <div
      className={cn(
        "kpi-card group cursor-pointer touch-manipulation select-none",
        "flex flex-col justify-between p-5",
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl", accentBar)} />
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-muted-foreground font-medium uppercase"
          style={{ fontSize: "0.65rem", letterSpacing: "0.09em" }}
        >
          {title}
        </span>
        {icon && (
          <span className="opacity-30 group-hover:opacity-60 transition-opacity text-primary">
            {icon}
          </span>
        )}
      </div>
      <div
        className="text-foreground font-bold"
        style={{ fontSize: "1.9rem", letterSpacing: "-0.03em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 mt-2.5", trendColor)}>
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : (
            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
            {isPositive ? "+" : ""}
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>
            {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}

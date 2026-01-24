import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

interface ComparisonViewProps {
  data?: ComparisonData[];
  isLoading?: boolean;
  period: "mom" | "yoy" | "wow";
  onPeriodChange: (period: "mom" | "yoy" | "wow") => void;
  title?: string;
  className?: string;
  formatValue?: (value: number) => string;
}

const periodLabels = {
  mom: { label: "Month over Month", current: "This Month", previous: "Last Month" },
  yoy: { label: "Year over Year", current: "This Year", previous: "Last Year" },
  wow: { label: "Week over Week", current: "This Week", previous: "Last Week" },
};

export function ComparisonView({
  data = [],
  isLoading,
  period,
  onPeriodChange,
  title = "Performance Comparison",
  className,
  formatValue = (v) => `$${v.toLocaleString()}`,
}: ComparisonViewProps) {
  const periodInfo = periodLabels[period];

  return (
    <div className={cn("glass-card p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">{title}</h3>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as typeof period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wow">Week over Week</SelectItem>
            <SelectItem value="mom">Month over Month</SelectItem>
            <SelectItem value="yoy">Year over Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground pb-2 border-b border-border">
            <div>Metric</div>
            <div className="text-right">{periodInfo.current}</div>
            <div className="text-right">{periodInfo.previous}</div>
            <div className="text-right">Change</div>
          </div>

          {/* Data Rows */}
          {data.map((item, index) => (
            <div
              key={item.label}
              className="grid grid-cols-4 gap-4 items-center py-3 border-b border-border/50 last:border-0"
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-right font-semibold">{formatValue(item.current)}</div>
              <div className="text-right text-muted-foreground">{formatValue(item.previous)}</div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.changePercent > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : item.changePercent < 0 ? (
                    <ArrowDownRight className="w-4 h-4 text-danger" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      item.changePercent > 0 && "text-success",
                      item.changePercent < 0 && "text-danger"
                    )}
                  >
                    {item.changePercent > 0 ? "+" : ""}
                    {item.changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No comparison data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mini comparison badge for KPI cards
interface ComparisonBadgeProps {
  current: number;
  previous: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function ComparisonBadge({
  current,
  previous,
  label,
  showValue = false,
  formatValue = (v) => `$${v.toLocaleString()}`,
}: ComparisonBadgeProps) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-muted-foreground">{label}:</span>}
      {showValue && (
        <span className="text-muted-foreground">{formatValue(previous)}</span>
      )}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          isPositive && "bg-success/10 text-success",
          !isPositive && !isNeutral && "bg-danger/10 text-danger",
          isNeutral && "bg-muted text-muted-foreground"
        )}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {isPositive ? "+" : ""}{change.toFixed(1)}%
      </div>
    </div>
  );
}

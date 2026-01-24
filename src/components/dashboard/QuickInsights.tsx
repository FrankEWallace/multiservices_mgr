import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, AlertTriangle, Info, Clock } from "lucide-react";
import { dashboardApi, Insight } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, any> = {
  success: TrendingUp,
  warning: AlertTriangle,
  danger: TrendingDown,
  info: Info,
};

export function QuickInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: dashboardApi.getInsights,
    staleTime: 60000,
  });

  const insights = data?.insights || [];

  return (
    <div className="space-y-6">
      {/* Performance Insights */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Quick Insights</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available at the moment
          </p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const IconComponent = iconMap[insight.type] || Info;
              return (
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
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  {insight.value !== undefined && (
                    <span
                      className={`text-sm font-semibold ${
                        insight.type === "success"
                          ? "text-success"
                          : insight.type === "warning"
                          ? "text-warning"
                          : insight.type === "danger"
                          ? "text-danger"
                          : "text-primary"
                      }`}
                    >
                      ${insight.value.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

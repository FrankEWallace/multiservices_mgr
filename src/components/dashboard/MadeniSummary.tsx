import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function MadeniSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "madeni-summary"],
    queryFn: dashboardApi.getMadeniSummary,
    staleTime: 60000,
  });

  const summary = data?.summary;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Madeni Overview</h3>
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-lg font-bold text-foreground">
            ${summary?.total?.toLocaleString() || 0}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-lg text-center bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Total Count</p>
              <p className="text-lg font-bold text-primary">{summary?.count || 0}</p>
              <p className="text-xs text-muted-foreground">outstanding</p>
            </div>
            <div className="p-3 rounded-lg text-center bg-danger/10 border border-danger/20">
              <p className="text-xs text-muted-foreground mb-1">Overdue</p>
              <p className="text-lg font-bold text-danger">{summary?.overdue || 0}</p>
              <p className="text-xs text-muted-foreground">past due date</p>
            </div>
          </div>

          {/* Due Soon Alert */}
          {summary?.dueSoon && summary.dueSoon > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warning">Due Soon</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.dueSoon} payments due within 7 days
                  </p>
                </div>
                <span className="text-lg font-bold text-warning">{summary.dueSoon}</span>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Collection Rate</span>
              <span className="font-medium text-foreground">
                {summary?.count && summary.count > 0
                  ? `${((1 - (summary.overdue || 0) / summary.count) * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

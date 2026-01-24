import { useQuery } from "@tanstack/react-query";
import { Target, CheckCircle, XCircle } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function GoalProgress() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "goal-progress"],
    queryFn: dashboardApi.getGoalProgress,
    staleTime: 60000,
  });

  const goals = data?.goals || [];
  const metCount = goals.filter((g) => g.progress >= 100).length;
  const totalProgress =
    goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Goal Progress</h3>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {metCount}/{goals.length} Met
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active goals
        </p>
      ) : (
        <>
          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Overall Progress
              </span>
              <span className="text-sm font-medium text-foreground">
                {totalProgress.toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(totalProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Per Goal Progress */}
          <div className="space-y-3">
            {goals.slice(0, 5).map((goal) => {
              const isMet = goal.progress >= 100;
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate max-w-[150px]">
                        {goal.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {goal.progress}%
                        </span>
                        {isMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger" />
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMet ? "bg-success" : "bg-warning"
                        }`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

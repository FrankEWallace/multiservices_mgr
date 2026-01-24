import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { goalsApi, Goal as GoalType } from "@/lib/api";
import { GoalForm } from "@/components/forms";
import { exportToCSV, goalExportColumns, exportToPDF, generateTableHTML, generateSummaryHTML } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Target, TrendingUp, Calendar, Plus, Download, Edit2 } from "lucide-react";

const Goals = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalType | null>(null);
  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => goalsApi.getAll(),
    staleTime: 30000,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["goals", "progress"],
    queryFn: goalsApi.getProgress,
    staleTime: 30000,
  });

  const goals = goalsData?.goals || [];
  const summary = progressData?.summary || { total: 0, achieved: 0, onTrack: 0, behind: 0, overallProgress: 0 };

  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalActual = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

  const isLoading = goalsLoading || progressLoading;

  const handleEdit = (goal: GoalType) => {
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingGoal(null);
  };

  const handleExportCSV = () => {
    exportToCSV(goals, goalExportColumns, `goals_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportPDF = () => {
    const summaryItems = generateSummaryHTML([
      { label: "Total Goals", value: summary.total },
      { label: "Achieved", value: summary.achieved, type: "success" },
      { label: "On Track", value: summary.onTrack, type: "warning" },
      { label: "Behind", value: summary.behind, type: "danger" },
    ]);
    const table = generateTableHTML(goals, goalExportColumns);
    exportToPDF("Goals Report", `<h2>Summary</h2>${summaryItems}<h2>Goals</h2>${table}`, "goals_report");
  };

  return (
    <DashboardLayout>
      <GoalForm open={formOpen} onOpenChange={handleFormClose} goal={editingGoal} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Goals & Performance</h1>
            <p className="text-muted-foreground">Track targets and achievement progress</p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Set New Goal
            </Button>
          </div>
        </div>

        {/* Overall Summary */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="kpi-card kpi-card-success">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="stat-label">Total Goals</span>
              </div>
              <p className="stat-value">{summary.total}</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="stat-label">Achieved</span>
              </div>
              <p className="stat-value">{summary.achieved}</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-warning" />
                <span className="stat-label">On Track</span>
              </div>
              <p className="stat-value">{summary.onTrack}</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-danger" />
                <span className="stat-label">Behind</span>
              </div>
              <p className="stat-value">{summary.behind}</p>
            </div>
          </div>
        )}

        {/* Overall Progress Bar */}
        {!isLoading && (
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Overall Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 progress-bar h-4">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.overallProgress >= 80 ? "bg-success" : 
                    summary.overallProgress >= 50 ? "bg-warning" : "bg-danger"
                  }`}
                  style={{ width: `${Math.min(100, summary.overallProgress)}%` }}
                />
              </div>
              <span className="text-lg font-semibold min-w-[60px]">
                {summary.overallProgress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-3 flex justify-between text-sm text-muted-foreground">
              <span>Target: ${totalTarget.toLocaleString()}</span>
              <span>Current: ${totalActual.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Goals by Service Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="section-title">Goals by Service</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No goals set yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Service</th>
                  <th>Period</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">Current</th>
                  <th className="text-center">Status</th>
                  <th>Progress</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const currentAmount = goal.currentAmount || 0;
                  const progressPercent = Math.min(100, (currentAmount / goal.targetAmount) * 100);
                  const isAchieved = goal.status === "achieved" || currentAmount >= goal.targetAmount;

                  return (
                    <tr key={goal.id}>
                      <td>
                        <div>
                          <p className="font-medium">{goal.title}</p>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground">{goal.description}</p>
                          )}
                        </div>
                      </td>
                      <td>{goal.serviceName || "All Services"}</td>
                      <td className="capitalize">{goal.period}</td>
                      <td className="text-right">${goal.targetAmount.toLocaleString()}</td>
                      <td className="text-right font-medium">${currentAmount.toLocaleString()}</td>
                      <td className="text-center">
                        {isAchieved ? (
                          <span className="badge-success">Achieved</span>
                        ) : goal.status === "in_progress" ? (
                          <span className="badge-warning">In Progress</span>
                        ) : goal.status === "not_started" ? (
                          <span className="badge-default">Not Started</span>
                        ) : (
                          <span className="badge-danger">Behind</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 progress-bar">
                            <div
                              className={`h-full rounded-full ${
                                progressPercent >= 100 ? "bg-success" : progressPercent >= 50 ? "bg-warning" : "bg-danger"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12">
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Goals;

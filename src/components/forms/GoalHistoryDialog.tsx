import { useQuery } from "@tanstack/react-query";
import { goalsApi, GoalHistory } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Trophy, TrendingUp, History, Target } from "lucide-react";
import { useState } from "react";

interface GoalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalHistoryDialog({ open, onOpenChange }: GoalHistoryDialogProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["goals", "history", statusFilter],
    queryFn: () => goalsApi.getHistory(undefined, statusFilter === "all" ? undefined : statusFilter, 100),
    enabled: open,
  });

  const history = data?.history || [];
  const summary = data?.summary;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="destructive" className="bg-destructive/20 text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Missed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return "text-success";
    if (rate >= 80) return "text-warning";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Goal Achievement History
          </DialogTitle>
          <DialogDescription>
            Review past goals and their achievement status
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.totalGoals}</p>
              <p className="text-xs text-muted-foreground">Total Goals</p>
            </div>
            <div className="bg-success/10 rounded-lg p-3 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-success" />
              <p className="text-2xl font-bold text-success">{summary.completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="bg-destructive/10 rounded-lg p-3 text-center">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{summary.missedGoals}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 py-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {history.length} record{history.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No goal history found</p>
              <p className="text-sm">Complete or archive goals to see them here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Achieved</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.goalType}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.serviceName}</TableCell>
                    <TableCell className="capitalize">{item.period}</TableCell>
                    <TableCell className="text-right">
                      ${item.targetAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.achievedAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getAchievementColor(item.achievementRate)}`}>
                      {item.achievementRate.toFixed(1)}%
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

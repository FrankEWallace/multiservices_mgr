import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  MoreVertical,
  FileText,
  Mail,
  History,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  BarChart2,
  Building2,
  Target,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  scheduledReportsApi,
  servicesApi,
  type ScheduledReport,
  type CreateScheduledReport,
  type ReportHistoryItem,
} from "@/lib/api";

// Report type options
const REPORT_TYPES = [
  { value: "daily", label: "Daily Summary", icon: Calendar },
  { value: "weekly", label: "Weekly Performance", icon: BarChart2 },
  { value: "monthly", label: "Monthly Financial", icon: FileText },
  { value: "service", label: "Service Report", icon: Building2 },
  { value: "debts", label: "Debts Aging", icon: Clock },
  { value: "goals", label: "Goals Achievement", icon: Target },
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface ScheduledReportsProps {
  className?: string;
}

export function ScheduledReports({ className }: ScheduledReportsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("schedules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateScheduledReport>({
    name: "",
    reportType: "daily",
    serviceId: null,
    schedule: "daily",
    scheduleTime: "09:00",
    scheduleDay: null,
    exportFormat: "pdf",
    emailDelivery: false,
    emailRecipients: [],
  });
  const [emailInput, setEmailInput] = useState("");

  // Queries
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ["scheduled-reports"],
    queryFn: scheduledReportsApi.getAll,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["report-history"],
    queryFn: () => scheduledReportsApi.getHistory({ limit: 50 }),
    enabled: activeTab === "history",
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["scheduled-reports-stats"],
    queryFn: scheduledReportsApi.getStats,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: scheduledReportsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports-stats"] });
      toast.success("Scheduled report created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create scheduled report");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateScheduledReport> }) =>
      scheduledReportsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Scheduled report updated successfully");
      setEditingSchedule(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update scheduled report");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: scheduledReportsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports-stats"] });
      toast.success("Scheduled report deleted successfully");
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete scheduled report");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: scheduledReportsApi.toggle,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle schedule");
    },
  });

  const runMutation = useMutation({
    mutationFn: scheduledReportsApi.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      queryClient.invalidateQueries({ queryKey: ["report-history"] });
      toast.success("Report generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate report");
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: scheduledReportsApi.deleteHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-history"] });
      toast.success("History entry deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete history entry");
    },
  });

  // Form helpers
  const resetForm = () => {
    setFormData({
      name: "",
      reportType: "daily",
      serviceId: null,
      schedule: "daily",
      scheduleTime: "09:00",
      scheduleDay: null,
      exportFormat: "pdf",
      emailDelivery: false,
      emailRecipients: [],
    });
    setEmailInput("");
  };

  const handleEditClick = (schedule: ScheduledReport) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      reportType: schedule.reportType,
      serviceId: schedule.serviceId,
      schedule: schedule.schedule,
      scheduleTime: schedule.scheduleTime || "09:00",
      scheduleDay: schedule.scheduleDay,
      exportFormat: schedule.exportFormat || "pdf",
      emailDelivery: schedule.emailDelivery || false,
      emailRecipients: schedule.emailRecipients || [],
    });
    setEmailInput("");
  };

  const handleAddEmail = () => {
    if (emailInput && emailInput.includes("@")) {
      setFormData((prev) => ({
        ...prev,
        emailRecipients: [...(prev.emailRecipients || []), emailInput],
      }));
      setEmailInput("");
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      emailRecipients: (prev.emailRecipients || []).filter((e) => e !== email),
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.reportType || !formData.schedule) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.reportType === "service" && !formData.serviceId) {
      toast.error("Please select a service for service reports");
      return;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getReportTypeIcon = (type: string) => {
    const reportType = REPORT_TYPES.find((r) => r.value === type);
    return reportType?.icon || FileText;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "generating":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Generating
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="schedules" className="gap-2">
              <Clock className="w-4 h-4" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <Dialog open={isCreateDialogOpen || !!editingSchedule} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingSchedule(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Scheduled Report" : "Create Scheduled Report"}
                </DialogTitle>
                <DialogDescription>
                  Set up automatic report generation on a schedule.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Schedule Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Weekly Sales Report"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Report Type */}
                <div className="grid gap-2">
                  <Label>Report Type *</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service (for service reports) */}
                {formData.reportType === "service" && (
                  <div className="grid gap-2">
                    <Label>Service *</Label>
                    <Select
                      value={formData.serviceId?.toString() || ""}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceId: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicesData?.services.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Schedule Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Frequency *</Label>
                    <Select
                      value={formData.schedule}
                      onValueChange={(value: "daily" | "weekly" | "monthly") =>
                        setFormData((prev) => ({ ...prev, schedule: value, scheduleDay: null }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.scheduleTime || "09:00"}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Day of week/month */}
                {formData.schedule === "weekly" && (
                  <div className="grid gap-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={formData.scheduleDay?.toString() || "1"}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, scheduleDay: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.schedule === "monthly" && (
                  <div className="grid gap-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={formData.scheduleDay?.toString() || "1"}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, scheduleDay: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Export Format */}
                <div className="grid gap-2">
                  <Label>Export Format</Label>
                  <Select
                    value={formData.exportFormat || "pdf"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, exportFormat: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPORT_FORMATS.map((fmt) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email Delivery */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Delivery</Label>
                    <p className="text-sm text-muted-foreground">
                      Send report via email when generated
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailDelivery || false}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, emailDelivery: checked }))
                    }
                  />
                </div>

                {/* Email Recipients */}
                {formData.emailDelivery && (
                  <div className="grid gap-2">
                    <Label>Email Recipients</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmail())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddEmail}>
                        Add
                      </Button>
                    </div>
                    {formData.emailRecipients && formData.emailRecipients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.emailRecipients.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-1">
                            <Mail className="w-3 h-3" />
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Note: Email delivery is a placeholder feature
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingSchedule ? (
                    "Update Schedule"
                  ) : (
                    "Create Schedule"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        {!statsLoading && statsData && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{statsData.stats.totalSchedules}</div>
                <p className="text-sm text-muted-foreground">Total Schedules</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {statsData.stats.activeSchedules}
                </div>
                <p className="text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{statsData.stats.last30Days.totalReports}</div>
                <p className="text-sm text-muted-foreground">Reports (30 days)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {statsData.stats.last30Days.successRate}
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Manage automatic report generation schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !schedulesData?.schedules.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No scheduled reports yet</p>
                  <p className="text-sm">Create your first schedule to automate report generation</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Report Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesData.schedules.map((schedule) => {
                      const ReportIcon = getReportTypeIcon(schedule.reportType);
                      return (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ReportIcon className="w-4 h-4 text-muted-foreground" />
                              {REPORT_TYPES.find((r) => r.value === schedule.reportType)?.label}
                              {schedule.serviceName && (
                                <Badge variant="outline" className="ml-1">
                                  {schedule.serviceName}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="capitalize">{schedule.schedule}</span>
                              <span className="text-muted-foreground">@ {schedule.scheduleTime}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase">
                              {schedule.exportFormat}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {schedule.isActive && schedule.nextRunAt ? (
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(schedule.nextRunAt), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={schedule.isActive || false}
                              onCheckedChange={() => toggleMutation.mutate(schedule.id)}
                              disabled={toggleMutation.isPending}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => runMutation.mutate(schedule.id)}
                                  disabled={runMutation.isPending}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Run Now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(schedule)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(schedule.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Schedules */}
          {statsData?.upcomingSchedules && statsData.upcomingSchedules.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Upcoming Reports (Next 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statsData.upcomingSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{schedule.name}</span>
                        <Badge variant="outline" className="capitalize">
                          {schedule.reportType}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {schedule.nextRunAt
                          ? format(new Date(schedule.nextRunAt), "MMM d, yyyy 'at' HH:mm")
                          : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !historyData?.history.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No report history yet</p>
                  <p className="text-sm">Generated reports will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.reportName}
                          {item.scheduleName && (
                            <span className="block text-xs text-muted-foreground">
                              from: {item.scheduleName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{item.reportType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {item.exportFormat}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.fileSizeFormatted || "-"}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.generatedAt
                            ? format(new Date(item.generatedAt), "MMM d, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "completed" && (
                              <Button variant="ghost" size="icon" title="Download">
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => deleteHistoryMutation.mutate(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {historyData && historyData.total > historyData.limit && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline">Load More</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled report and all its history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

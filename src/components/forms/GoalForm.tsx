import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { goalsApi, servicesApi, Goal } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

const goalTypes = [
  { value: "revenue", label: "Revenue Target" },
  { value: "profit", label: "Profit Target" },
  { value: "transactions", label: "Transaction Count" },
  { value: "debt_collection", label: "Debt Collection" },
  { value: "other", label: "Other" },
];

const periods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function GoalForm({ open, onOpenChange, goal }: GoalFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!goal;

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const services = servicesData?.services || [];

  const getDefaultDates = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: now.toISOString().split("T")[0],
      endDate: endOfMonth.toISOString().split("T")[0],
    };
  };

  const defaultDates = getDefaultDates();

  const [formData, setFormData] = useState({
    serviceId: goal?.serviceId?.toString() || "",
    title: goal?.title || "",
    description: goal?.description || "",
    goalType: goal?.goalType || "revenue",
    period: goal?.period || "monthly",
    targetAmount: goal?.targetAmount?.toString() || "",
    currentAmount: goal?.currentAmount?.toString() || "0",
    startDate: goal?.startDate || defaultDates.startDate,
    endDate: goal?.endDate || defaultDates.endDate,
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        serviceId: goal.serviceId?.toString() || "",
        title: goal.title || "",
        description: goal.description || "",
        goalType: goal.goalType || "revenue",
        period: goal.period || "monthly",
        targetAmount: goal.targetAmount?.toString() || "",
        currentAmount: goal.currentAmount?.toString() || "0",
        startDate: goal.startDate || defaultDates.startDate,
        endDate: goal.endDate || defaultDates.endDate,
      });
    }
  }, [goal]);

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Goal created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create goal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Goal> }) =>
      goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Goal updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update goal");
    },
  });

  const resetForm = () => {
    const dates = getDefaultDates();
    setFormData({
      serviceId: "",
      title: "",
      description: "",
      goalType: "revenue",
      period: "monthly",
      targetAmount: "",
      currentAmount: "0",
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.targetAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data: Partial<Goal> = {
      serviceId: formData.serviceId ? Number(formData.serviceId) : undefined,
      title: formData.title,
      description: formData.description || undefined,
      goalType: formData.goalType,
      period: formData.period,
      targetAmount: Number(formData.targetAmount),
      currentAmount: Number(formData.currentAmount) || 0,
      startDate: formData.startDate,
      endDate: formData.endDate,
    };

    if (isEditing && goal) {
      updateMutation.mutate({ id: goal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Set New Goal"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the goal details below."
              : "Define a new performance target."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Monthly Revenue Target"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this goal..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select
                value={formData.goalType}
                onValueChange={(value) => setFormData({ ...formData, goalType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={formData.period}
                onValueChange={(value) => setFormData({ ...formData, period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceId">Related Service</Label>
            <Select
              value={formData.serviceId || "all"}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All services (company-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services (Company-wide)</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount ($) *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="currentAmount">Current Progress ($)</Label>
                <Input
                  id="currentAmount"
                  type="number"
                  step="0.01"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

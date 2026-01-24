import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { expensesApi, servicesApi, Expense } from "@/lib/api";
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
import { Switch } from "@/components/ui/switch";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

const expenseCategories = [
  { value: "operating", label: "Operating" },
  { value: "salaries", label: "Salaries & Wages" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "supplies", label: "Supplies" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "transport", label: "Transport" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Taxes" },
  { value: "other", label: "Other" },
];

export function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!expense;

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const services = servicesData?.services || [];

  const [formData, setFormData] = useState({
    serviceId: expense?.serviceId?.toString() || "",
    amount: expense?.amount?.toString() || "",
    date: expense?.date || new Date().toISOString().split("T")[0],
    category: expense?.category || "operating",
    description: expense?.description || "",
    vendor: expense?.vendor || "",
    isRecurring: expense?.isRecurring ?? false,
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        serviceId: expense.serviceId?.toString() || "",
        amount: expense.amount?.toString() || "",
        date: expense.date || new Date().toISOString().split("T")[0],
        category: expense.category || "operating",
        description: expense.description || "",
        vendor: expense.vendor || "",
        isRecurring: expense.isRecurring ?? false,
      });
    }
  }, [expense]);

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create expense");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const resetForm = () => {
    setFormData({
      serviceId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      category: "operating",
      description: "",
      vendor: "",
      isRecurring: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data: Partial<Expense> = {
      serviceId: formData.serviceId ? Number(formData.serviceId) : undefined,
      amount: Number(formData.amount),
      date: formData.date,
      category: formData.category,
      description: formData.description || undefined,
      vendor: formData.vendor || undefined,
      isRecurring: formData.isRecurring,
    };

    if (isEditing && expense) {
      updateMutation.mutate({ id: expense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the expense details below."
              : "Record a new expense transaction."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service (Optional)</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General Expense</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor / Payee</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g., Office Supplies Inc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the expense"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
            />
            <Label htmlFor="isRecurring">This is a recurring expense</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Expense" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

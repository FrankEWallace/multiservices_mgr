import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { revenueApi, servicesApi, Revenue } from "@/lib/api";
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

interface RevenueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenue?: Revenue | null;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export function RevenueForm({ open, onOpenChange, revenue }: RevenueFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!revenue;

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const services = servicesData?.services || [];

  const [formData, setFormData] = useState({
    serviceId: revenue?.serviceId?.toString() || "",
    amount: revenue?.amount?.toString() || "",
    date: revenue?.date || new Date().toISOString().split("T")[0],
    description: revenue?.description || "",
    paymentMethod: revenue?.paymentMethod || "cash",
    reference: revenue?.reference || "",
  });

  useEffect(() => {
    if (revenue) {
      setFormData({
        serviceId: revenue.serviceId?.toString() || "",
        amount: revenue.amount?.toString() || "",
        date: revenue.date || new Date().toISOString().split("T")[0],
        description: revenue.description || "",
        paymentMethod: revenue.paymentMethod || "cash",
        reference: revenue.reference || "",
      });
    }
  }, [revenue]);

  const createMutation = useMutation({
    mutationFn: revenueApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Revenue entry created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create revenue entry");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Revenue> }) =>
      revenueApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Revenue entry updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update revenue entry");
    },
  });

  const resetForm = () => {
    setFormData({
      serviceId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      paymentMethod: "cash",
      reference: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data: Partial<Revenue> = {
      serviceId: Number(formData.serviceId),
      amount: Number(formData.amount),
      date: formData.date,
      description: formData.description || undefined,
      paymentMethod: formData.paymentMethod,
      reference: formData.reference || undefined,
    };

    if (isEditing && revenue) {
      updateMutation.mutate({ id: revenue.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Revenue Entry" : "Add Revenue Entry"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the revenue entry details below."
              : "Record a new revenue transaction."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceId">Service *</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference / Receipt No.</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g., INV-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

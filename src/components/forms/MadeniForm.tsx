import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { debtsApi, servicesApi, Debt } from "@/lib/api";
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

interface MadeniFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  madeni?: Debt | null;
}

export function MadeniForm({ open, onOpenChange, madeni }: MadeniFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!madeni;

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const services = servicesData?.services || [];

  const [formData, setFormData] = useState({
    serviceId: madeni?.serviceId?.toString() || "",
    debtorName: madeni?.debtorName || "",
    debtorContact: madeni?.debtorContact || "",
    debtorEmail: madeni?.debtorEmail || "",
    debtorAddress: madeni?.debtorAddress || "",
    originalAmount: madeni?.originalAmount?.toString() || "",
    issueDate: madeni?.issueDate || new Date().toISOString().split("T")[0],
    dueDate: madeni?.dueDate || "",
    notes: madeni?.notes || "",
  });

  useEffect(() => {
    if (madeni) {
      setFormData({
        serviceId: madeni.serviceId?.toString() || "",
        debtorName: madeni.debtorName || "",
        debtorContact: madeni.debtorContact || "",
        debtorEmail: madeni.debtorEmail || "",
        debtorAddress: madeni.debtorAddress || "",
        originalAmount: madeni.originalAmount?.toString() || "",
        issueDate: madeni.issueDate || new Date().toISOString().split("T")[0],
        dueDate: madeni.dueDate || "",
        notes: madeni.notes || "",
      });
    }
  }, [madeni]);

  const createMutation = useMutation({
    mutationFn: debtsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Debtor added successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add debtor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Debt> }) =>
      debtsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Debtor updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update debtor");
    },
  });

  const resetForm = () => {
    setFormData({
      serviceId: "",
      debtorName: "",
      debtorContact: "",
      debtorEmail: "",
      debtorAddress: "",
      originalAmount: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.debtorName || !formData.originalAmount || !formData.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data: Partial<Debt> = {
      serviceId: formData.serviceId ? Number(formData.serviceId) : undefined,
      debtorName: formData.debtorName,
      debtorContact: formData.debtorContact || undefined,
      debtorEmail: formData.debtorEmail || undefined,
      debtorAddress: formData.debtorAddress || undefined,
      originalAmount: Number(formData.originalAmount),
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      notes: formData.notes || undefined,
    };

    if (isEditing && madeni) {
      updateMutation.mutate({ id: madeni.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Debtor" : "Add New Debtor"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the debtor information below."
              : "Record a new debt entry."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debtorName">Debtor Name *</Label>
            <Input
              id="debtorName"
              value={formData.debtorName}
              onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
              placeholder="Full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debtorContact">Phone</Label>
              <Input
                id="debtorContact"
                value={formData.debtorContact}
                onChange={(e) => setFormData({ ...formData, debtorContact: e.target.value })}
                placeholder="+254..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtorEmail">Email</Label>
              <Input
                id="debtorEmail"
                type="email"
                value={formData.debtorEmail}
                onChange={(e) => setFormData({ ...formData, debtorEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debtorAddress">Address</Label>
            <Input
              id="debtorAddress"
              value={formData.debtorAddress}
              onChange={(e) => setFormData({ ...formData, debtorAddress: e.target.value })}
              placeholder="Physical address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceId">Related Service</Label>
            <Select
              value={formData.serviceId || "none"}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific service</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="originalAmount">Amount ($) *</Label>
              <Input
                id="originalAmount"
                type="number"
                step="0.01"
                value={formData.originalAmount}
                onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details about this debt..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Debtor" : "Add Debtor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Payment Form for recording payments against a debt
interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  madeni: Debt | null;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "check", label: "Check" },
];

export function PaymentForm({ open, onOpenChange, madeni }: PaymentFormProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; paymentDate: string; paymentMethod: string } }) =>
      debtsApi.recordPayment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Payment recorded. New balance: $${data.newBalance.toLocaleString()}`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      reference: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!madeni || !formData.amount) {
      toast.error("Please enter a payment amount");
      return;
    }

    const amount = Number(formData.amount);
    if (amount > madeni.balance) {
      toast.error(`Payment amount cannot exceed balance ($${madeni.balance.toLocaleString()})`);
      return;
    }

    paymentMutation.mutate({
      id: madeni.id,
      data: {
        amount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
      },
    });
  };

  if (!madeni) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Recording payment for {madeni.debtorName}. Current balance: ${madeni.balance.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Amount:</span>
              <span className="font-medium">${madeni.originalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">${madeni.amountPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t">
              <span>Outstanding Balance:</span>
              <span className="text-danger">${madeni.balance.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                max={madeni.balance}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

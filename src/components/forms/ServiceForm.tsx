import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, Service } from "@/lib/api";
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

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const icons = [
  { value: "truck", label: "Truck (Transport)" },
  { value: "package", label: "Package (Logistics)" },
  { value: "building", label: "Building (Real Estate)" },
  { value: "wheat", label: "Wheat (Agriculture)" },
  { value: "shopping-cart", label: "Cart (Retail)" },
  { value: "hammer", label: "Hammer (Construction)" },
];

const colors = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
  { value: "gray", label: "Gray" },
];

export function ServiceForm({ open, onOpenChange, service }: ServiceFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!service;

  const [formData, setFormData] = useState({
    name: service?.name || "",
    description: service?.description || "",
    icon: service?.icon || "truck",
    color: service?.color || "blue",
    isActive: service?.isActive ?? true,
    dailyTarget: service?.dailyTarget?.toString() || "",
    monthlyTarget: service?.monthlyTarget?.toString() || "",
    yearlyTarget: service?.yearlyTarget?.toString() || "",
  });

  const createMutation = useMutation({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create service");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) =>
      servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update service");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "truck",
      color: "blue",
      isActive: true,
      dailyTarget: "",
      monthlyTarget: "",
      yearlyTarget: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Partial<Service> = {
      name: formData.name,
      description: formData.description || undefined,
      icon: formData.icon,
      color: formData.color,
      isActive: formData.isActive,
      dailyTarget: formData.dailyTarget ? Number(formData.dailyTarget) : undefined,
      monthlyTarget: formData.monthlyTarget ? Number(formData.monthlyTarget) : undefined,
      yearlyTarget: formData.yearlyTarget ? Number(formData.yearlyTarget) : undefined,
    };

    if (isEditing && service) {
      updateMutation.mutate({ id: service.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service details below."
              : "Fill in the details to create a new service."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Transport Services"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the service"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {icons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyTarget">Daily Target ($)</Label>
              <Input
                id="dailyTarget"
                type="number"
                value={formData.dailyTarget}
                onChange={(e) => setFormData({ ...formData, dailyTarget: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyTarget">Monthly Target ($)</Label>
              <Input
                id="monthlyTarget"
                type="number"
                value={formData.monthlyTarget}
                onChange={(e) => setFormData({ ...formData, monthlyTarget: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearlyTarget">Yearly Target ($)</Label>
              <Input
                id="yearlyTarget"
                type="number"
                value={formData.yearlyTarget}
                onChange={(e) => setFormData({ ...formData, yearlyTarget: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Service is active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

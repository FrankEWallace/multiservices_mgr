import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { entriesApi, servicesApi, Entry } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Building2,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

const EXPENSE_CATEGORIES = [
  "Salaries",
  "Rent",
  "Utilities",
  "Supplies",
  "Marketing",
  "Transport",
  "Maintenance",
  "Insurance",
  "Taxes",
  "Other",
];

export default function Activities() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [filterType, setFilterType] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formAmount, setFormAmount] = useState("");
  const [formServiceId, setFormServiceId] = useState<string | undefined>(undefined);
  const [formCategory, setFormCategory] = useState<string | undefined>(undefined);
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formImages, setFormImages] = useState<string[]>([]);

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  // Fetch entries
  const { data, isLoading } = useQuery({
    queryKey: ["entries", filterType, filterService, searchQuery, page],
    queryFn: () =>
      entriesApi.getAll({
        type: filterType !== "all" ? (filterType as "income" | "expense") : undefined,
        serviceId: filterService !== "all" ? parseInt(filterService) : undefined,
        search: searchQuery || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  // Fetch summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["entries-summary"],
    queryFn: () => entriesApi.getSummary(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-summary"] });
      toast({ title: "Entry added successfully" });
      closeForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => entriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-summary"] });
      toast({ title: "Entry updated successfully" });
      closeForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: entriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-summary"] });
      toast({ title: "Entry deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const openNewForm = () => {
    setEditingEntry(null);
    setFormType("income");
    setFormAmount("");
    setFormServiceId(undefined);
    setFormCategory(undefined);
    setFormDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormImages([]);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: Entry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setFormAmount(entry.amount.toString());
    setFormServiceId(entry.serviceId?.toString() || undefined);
    setFormCategory(entry.category || undefined);
    setFormDescription(entry.description || "");
    setFormDate(entry.date);
    setFormImages(entry.images || []);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleSubmit = () => {
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const data = {
      type: formType,
      amount,
      serviceId: formServiceId ? parseInt(formServiceId) : undefined,
      category: formCategory || undefined,
      description: formDescription || undefined,
      images: formImages.length > 0 ? formImages : undefined,
      date: formDate,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for demo purposes
    // In production, upload to cloud storage
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormImages([...formImages, base64]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setFormImages(formImages.filter((_, i) => i !== index));
  };

  const hasFilters = filterType !== "all" || filterService !== "all" || searchQuery;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activities</h1>
            <p className="text-muted-foreground">Track income and expenses</p>
          </div>
          <Button onClick={openNewForm} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </>
          ) : (
            <>
              <Card className="glass-card border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-2xl font-bold text-green-500">
                        ${(summary?.totalIncome || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {summary?.incomeCount || 0} entries
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-green-500/10">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-500">
                        ${(summary?.totalExpense || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {summary?.expenseCount || 0} entries
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-red-500/10">
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        (summary?.netProfit || 0) >= 0 ? "text-primary" : "text-red-500"
                      )}>
                        ${(summary?.netProfit || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((summary?.incomeCount || 0) + (summary?.expenseCount || 0))} total entries
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-green-500" /> Income
                    </span>
                  </SelectItem>
                  <SelectItem value="expense">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="w-3 h-3 text-red-500" /> Expense
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterService} onValueChange={(v) => { setFilterService(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {servicesData?.services?.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search description..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setFilterService("all");
                    setSearchQuery("");
                    setPage(0);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </>
          ) : entries.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No entries found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {hasFilters
                    ? "Try adjusting your filters"
                    : "Start by adding your first income or expense entry"}
                </p>
                {!hasFilters && (
                  <Button onClick={openNewForm} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => openEditForm(entry)}
                onDelete={() => setDeleteId(entry.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={formType === "income" ? "default" : "outline"}
                className={cn(
                  "gap-2",
                  formType === "income" && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setFormType("income")}
              >
                <TrendingUp className="w-4 h-4" />
                Income
              </Button>
              <Button
                type="button"
                variant={formType === "expense" ? "default" : "outline"}
                className={cn(
                  "gap-2",
                  formType === "expense" && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setFormType("expense")}
              >
                <TrendingDown className="w-4 h-4" />
                Expense
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="pl-9 text-lg"
                />
              </div>
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label>Service / Category</Label>
              <Select value={formServiceId} onValueChange={(value) => setFormServiceId(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {servicesData?.services?.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category (for expenses) */}
            {formType === "expense" && !formServiceId && (
              <div className="space-y-2">
                <Label>Expense Category</Label>
                <Select value={formCategory} onValueChange={(value) => setFormCategory(value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any notes or description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Images (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {formImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Attachment ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className={cn(
                formType === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingEntry
                ? "Update"
                : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = entry.type === "income";

  return (
    <Card className={cn(
      "glass-card transition-all hover:shadow-md",
      isIncome ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              isIncome ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {isIncome ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={isIncome ? "default" : "secondary"} className={cn(
                  "capitalize",
                  isIncome ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {entry.type}
                </Badge>
                {entry.serviceName && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {entry.serviceName}
                  </Badge>
                )}
                {entry.category && (
                  <Badge variant="outline">{entry.category}</Badge>
                )}
              </div>
              {entry.description && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {entry.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(entry.date), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Amount & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <p className={cn(
              "text-xl font-bold",
              isIncome ? "text-green-500" : "text-red-500"
            )}>
              {isIncome ? "+" : "-"}${entry.amount.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Images */}
        {entry.images && entry.images.length > 0 && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            {entry.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Attachment ${i + 1}`}
                className="w-12 h-12 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                onClick={() => window.open(img, "_blank")}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

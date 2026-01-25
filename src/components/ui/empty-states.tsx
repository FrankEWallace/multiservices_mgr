import React from "react";
import { 
  FileX, 
  Search, 
  Inbox, 
  FolderOpen, 
  Users, 
  Receipt, 
  Target, 
  TrendingUp, 
  AlertCircle,
  Plus,
  RefreshCcw,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "secondary" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    container: "py-6",
    icon: "h-8 w-8",
    iconContainer: "w-12 h-12",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    container: "py-10",
    icon: "h-10 w-10",
    iconContainer: "w-16 h-16",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-12 w-12",
    iconContainer: "w-20 h-20",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.container,
      className
    )}>
      <div className={cn(
        "rounded-full bg-muted flex items-center justify-center mb-4",
        sizes.iconContainer
      )}>
        <Icon className={cn("text-muted-foreground", sizes.icon)} />
      </div>
      <h3 className={cn("font-semibold", sizes.title)}>{title}</h3>
      {description && (
        <p className={cn("text-muted-foreground mt-1 max-w-sm", sizes.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-2 mt-4">
          {action && (
            <Button 
              variant={action.variant || "default"} 
              onClick={action.onClick}
              size={size === "sm" ? "sm" : "default"}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Pre-configured empty states for common scenarios
// ============================================

interface SimpleEmptyStateProps {
  action?: () => void;
  actionLabel?: string;
  className?: string;
}

/**
 * No search results
 */
export function NoSearchResults({ 
  action, 
  actionLabel = "Clear search",
  className 
}: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={action ? { label: actionLabel, onClick: action, variant: "outline" } : undefined}
      className={className}
    />
  );
}

/**
 * No data available
 */
export function NoData({ 
  action, 
  actionLabel = "Add new",
  className 
}: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="No data yet"
      description="Get started by adding your first entry."
      action={action ? { label: actionLabel, onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No services
 */
export function NoServices({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No services yet"
      description="Create your first service to start tracking business performance."
      action={action ? { label: "Add Service", onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No revenue entries
 */
export function NoRevenue({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No revenue recorded"
      description="Start recording revenue to track your business income."
      action={action ? { label: "Record Revenue", onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No expenses
 */
export function NoExpenses({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Receipt}
      title="No expenses recorded"
      description="Track your business expenses to understand your costs."
      action={action ? { label: "Add Expense", onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No debts/debtors
 */
export function NoDebts({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="No debtors"
      description="When you have outstanding debts to track, they'll appear here."
      action={action ? { label: "Add Debtor", onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No goals
 */
export function NoGoals({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Target}
      title="No goals set"
      description="Set goals to track your progress and stay motivated."
      action={action ? { label: "Create Goal", onClick: action, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * No reports
 */
export function NoReports({ action, className }: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={FileX}
      title="No reports generated"
      description="Generate reports to analyze your business performance."
      action={action ? { label: "Generate Report", onClick: action } : undefined}
      className={className}
    />
  );
}

/**
 * Error loading data
 */
export function ErrorLoadingData({ 
  action, 
  actionLabel = "Try again",
  className 
}: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Failed to load data"
      description="Something went wrong while loading the data. Please try again."
      action={action ? { label: actionLabel, onClick: action, icon: RefreshCcw, variant: "outline" } : undefined}
      className={className}
    />
  );
}

/**
 * No items in filter
 */
export function NoFilterResults({ 
  action, 
  actionLabel = "Clear filters",
  className 
}: SimpleEmptyStateProps) {
  return (
    <EmptyState
      icon={Search}
      title="No matches"
      description="No items match your current filters. Try adjusting them."
      action={action ? { label: actionLabel, onClick: action, variant: "outline" } : undefined}
      className={className}
    />
  );
}

/**
 * Coming soon / Feature not available
 */
export function ComingSoon({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Coming Soon"
      description="This feature is currently under development and will be available soon."
      className={className}
    />
  );
}

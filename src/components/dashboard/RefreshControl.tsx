import { useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RefreshControlProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  interval: number; // in seconds, 0 = disabled
  onIntervalChange: (seconds: number) => void;
  lastUpdated?: Date;
  className?: string;
}

const intervalOptions = [
  { label: "Off", value: 0 },
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
];

export function RefreshControl({
  onRefresh,
  isRefreshing,
  interval,
  onIntervalChange,
  lastUpdated,
  className,
}: RefreshControlProps) {
  const currentIntervalLabel = intervalOptions.find(o => o.value === interval)?.label || "Off";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {lastUpdated && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Updated {formatTimeAgo(lastUpdated)}
        </span>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Auto: {currentIntervalLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Auto Refresh</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {intervalOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onIntervalChange(option.value)}
              className={cn(interval === option.value && "bg-accent")}
            >
              {option.label}
              {interval === option.value && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-muted">
            <Icon className="w-12 h-12 text-muted-foreground/50" />
          </div>
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
          {description}
        </p>
        {action && <div className="flex justify-center">{action}</div>}
      </CardContent>
    </Card>
  );
}

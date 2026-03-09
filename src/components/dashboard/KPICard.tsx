import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  /** Compact horizontal layout for the KPI strip */
  compact?: boolean;
  /** Enables pointer-follow spotlight + subtle 3D tilt */
  interactive?: boolean;
  /** Optional click handler (e.g., open drilldown) */
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  variant = "default",
  icon,
  compact = false,
  interactive = true,
  onClick,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNeutral = change !== undefined && change === 0;
  const isNegative = change !== undefined && change < 0;

  const trendColor = isPositive
    ? "text-success"
    : isNegative
      ? "text-danger"
      : "text-muted-foreground";

  const trendPill = isPositive
    ? "border-success/25 bg-success/10 text-success"
    : isNegative
      ? "border-danger/25 bg-danger/10 text-danger"
      : "border-border/60 bg-muted/40 text-muted-foreground";

  const accentBar = {
    default: "bg-border",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[variant];

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;

      el.style.setProperty("--px", `${px}%`);
      el.style.setProperty("--py", `${py}%`);

      // Subtle tilt (clamped)
      const dx = px - 50;
      const dy = py - 50;
      const ry = Math.max(-8, Math.min(8, dx / 6));
      const rx = Math.max(-8, Math.min(8, -dy / 6));
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    },
    [interactive],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;

      const el = e.currentTarget;
      el.style.setProperty("--px", "50%");
      el.style.setProperty("--py", "35%");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    },
    [interactive],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const changeIntensity = change === undefined ? 0 : Math.min(100, Math.abs(change) * 2);

  if (compact) {
    // Horizontal strip tile — used in the 3-across KPI row
    return (
      <div
        className={cn(
          "kpi-card group touch-manipulation select-none",
          interactive && "kpi-interactive",
          "flex flex-col justify-between",
          onClick ? "cursor-pointer" : "cursor-default",
        )}
        style={{ minHeight: 0 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? title : undefined}
      >
        {/* Accent line top */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl",
            "origin-left scale-x-[0.86] group-hover:scale-x-100 group-hover:h-[3px] transition-all duration-200",
            accentBar,
          )}
        />

        <div className="flex items-center justify-between mb-3">
          <span
            className="text-muted-foreground font-medium uppercase"
            style={{ fontSize: "0.65rem", letterSpacing: "0.09em" }}
          >
            {title}
          </span>
          {icon && (
            <span
              className={cn(
                "opacity-30 group-hover:opacity-70 transition-opacity",
                "group-hover:drop-shadow-[0_8px_20px_hsl(var(--primary)/0.18)]",
                trendColor,
              )}
            >
              {icon}
            </span>
          )}
        </div>

        <div
          className={cn(
            "kpi-value text-foreground font-bold leading-none",
            "transition-transform duration-200 group-hover:-translate-y-[1px]",
          )}
          style={{ fontSize: "1.55rem", letterSpacing: "-0.03em" }}
        >
          {value}
        </div>

        {change !== undefined && (
          <div className="mt-2.5">
            <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", trendPill)}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <Minus className="w-3 h-3" strokeWidth={2.5} />
              )}
              <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                {isPositive ? "+" : ""}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                {changeLabel}
              </span>
            </div>

            {/* Visual momentum line */}
            <div className="mt-2 h-1 w-full rounded-full bg-border/40 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  isPositive ? "bg-success" : isNegative ? "bg-danger" : "bg-muted-foreground/30",
                )}
                style={{ width: `${changeIntensity}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-size fallback (unchanged behaviour for other pages)
  return (
    <div
      className={cn(
        "kpi-card group touch-manipulation select-none",
        interactive && "kpi-interactive",
        "flex flex-col justify-between p-5",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? title : undefined}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl",
          "origin-left scale-x-[0.86] group-hover:scale-x-100 group-hover:h-[3px] transition-all duration-200",
          accentBar,
        )}
      />
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-muted-foreground font-medium uppercase"
          style={{ fontSize: "0.65rem", letterSpacing: "0.09em" }}
        >
          {title}
        </span>
        {icon && (
          <span
            className={cn(
              "opacity-30 group-hover:opacity-70 transition-opacity text-primary",
              "group-hover:drop-shadow-[0_10px_24px_hsl(var(--primary)/0.22)]",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn("kpi-value text-foreground font-bold", "transition-transform duration-200 group-hover:-translate-y-[1px]")}
        style={{ fontSize: "1.9rem", letterSpacing: "-0.03em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      {change !== undefined && (
        <div className="mt-3">
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1", trendPill)}>
            <span className={cn("flex items-center gap-1", trendColor)}>
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : isNegative ? (
                <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : (
                <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
              <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                {isPositive ? "+" : ""}
                {Math.abs(change).toFixed(1)}%
              </span>
            </span>
            <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
              {changeLabel}
            </span>
          </div>

          {/* Visual momentum line */}
          <div className="mt-2.5 h-1 w-full rounded-full bg-border/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                isPositive ? "bg-success" : isNegative ? "bg-danger" : "bg-muted-foreground/30",
              )}
              style={{ width: `${changeIntensity}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

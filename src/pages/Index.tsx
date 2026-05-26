import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { DrillDownDialog } from "@/components/dashboard/DrillDownDialog";
import { dashboardApi, servicesApi, entriesApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/hooks/use-number-format";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Minus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── Period helpers ────────────────────────────────────────────────────────── */
type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week:  "Week",
  month: "Month",
  year:  "Year",
};

function getPeriodRange(period: Period): { from: string; to: string } {
  const now  = new Date();
  const pad  = (n: number) => String(n).padStart(2, "0");
  const iso  = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = iso(now);

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const day   = now.getDay(); // 0=Sun
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      return { from: iso(start), to: today };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: iso(start), to: today };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: iso(start), to: today };
    }
  }
}

/* ─── Icon map ──────────────────────────────────────────────────────────────── */
function kpiIcon(name: string) {
  switch (name) {
    case "dollar-sign":  return <DollarSign className="w-4 h-4" />;
    case "trending-up":  return <TrendingUp  className="w-4 h-4" />;
    case "target":       return <Target      className="w-4 h-4" />;
    default:             return <Receipt     className="w-4 h-4" />;
  }
}

/* ─── Entry row helper ──────────────────────────────────────────────────────── */
function EntryRow({
  entry,
  formatCurrency,
}: {
  entry: NonNullable<ReturnType<typeof entriesApi.getAll> extends Promise<infer R> ? R : never>["entries"][number];
  formatCurrency: (v: number) => string;
}) {
  const isIncome = entry.type === "income";
  const label    = entry.category ?? (isIncome ? "Income" : "Expense");
  const dateStr  = new Date(entry.date).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 group">
      {/* Type dot */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isIncome
            ? "hsl(142 65% 36% / 0.12)"
            : "hsl(4 86% 58% / 0.10)",
        }}
      >
        {isIncome ? (
          <ArrowUpRight
            className="w-4 h-4"
            style={{ color: "hsl(142 65% 36%)" }}
            strokeWidth={2.2}
          />
        ) : (
          <ArrowDownRight
            className="w-4 h-4"
            style={{ color: "hsl(4 86% 58%)" }}
            strokeWidth={2.2}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {entry.serviceName ?? "No service"} · {dateStr}
        </p>
      </div>

      {/* Amount */}
      <span
        className="font-semibold tabular-nums text-sm flex-shrink-0"
        style={{
          color: isIncome ? "hsl(142 65% 36%)" : "hsl(4 86% 58%)",
        }}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(entry.amount)}
      </span>
    </div>
  );
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
const Index = () => {
  const queryClient               = useQueryClient();
  const { formatCurrency }        = useNumberFormat();

  const [period, setPeriod]       = useState<Period>("month");
  const [serviceId, setServiceId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drillDown, setDrillDown] = useState<
    "revenue" | "profit" | "expenses" | "debt" | "service" | null
  >(null);

  const range = useMemo(() => getPeriodRange(period), [period]);

  /* ── Queries ── */
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn:  servicesApi.getAll,
    staleTime: 300_000,
  });

  // Hero: today's entry summary (income – expense)
  const todayRange = useMemo(() => getPeriodRange("today"), []);
  const { data: todaySummary, isLoading: heroLoading } = useQuery({
    queryKey: ["entries", "summary", "today"],
    queryFn:  () =>
      entriesApi.getSummary({
        startDate: todayRange.from,
        endDate:   todayRange.to,
      }),
    staleTime: 30_000,
  });

  // Period KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: [
      "dashboard", "kpis", serviceId, range.from, range.to,
    ],
    queryFn: () =>
      dashboardApi.getKPIs({
        serviceId: serviceId !== "all" ? Number(serviceId) : undefined,
        startDate: range.from,
        endDate:   range.to,
      }),
    staleTime: 30_000,
  });

  // Recent entries
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ["entries", "recent"],
    queryFn:  () => entriesApi.getAll({ limit: 6 }),
    staleTime: 30_000,
  });

  /* ── Derived values ── */
  const netToday  = todaySummary?.netProfit    ?? 0;
  const todayIn   = todaySummary?.totalIncome  ?? 0;
  const todayOut  = todaySummary?.totalExpense ?? 0;
  const netPos    = netToday >= 0;

  const kpis = useMemo(
    () =>
      (kpiData?.kpis ?? [])
        .filter((k) => !k.title.toLowerCase().includes("debt"))
        .slice(0, 4)
        .map((k) => ({ ...k, formattedValue: formatCurrency(k.value) })),
    [kpiData, formatCurrency],
  );

  const recentEntries = recentData?.entries ?? [];

  /* ── Refresh ── */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["entries"] });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  /* ── Render ── */
  return (
    <DashboardLayout>
      {/* Drill-down dialog */}
      <DrillDownDialog
        open={drillDown !== null}
        onOpenChange={(open) => !open && setDrillDown(null)}
        type={drillDown}
        dateRange={{ from: new Date(range.from), to: new Date(range.to) }}
      />

      <div className="space-y-4 md:space-y-5">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="font-bold text-foreground leading-tight"
              style={{ fontSize: "1.55rem", letterSpacing: "-0.03em" }}
            >
              Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Service filter */}
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger
                className="h-8 rounded-full text-xs font-medium border-border bg-secondary/70 px-3 gap-1 focus:ring-0"
                style={{ minWidth: 110 }}
              >
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {servicesData?.services?.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary/70 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90 touch-manipulation disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {/* ── Hero — Today's Net ───────────────────────────────────── */}
        <div
          className="glass-card p-5 relative overflow-hidden"
          style={{
            background: netPos
              ? "linear-gradient(135deg, hsl(142 65% 36% / 0.06) 0%, hsl(var(--card)) 60%)"
              : "linear-gradient(135deg, hsl(4 86% 58% / 0.06) 0%, hsl(var(--card)) 60%)",
          }}
        >
          {/* Subtle glow blob */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{
              background: netPos
                ? "hsl(142 65% 36%)"
                : "hsl(4 86% 58%)",
              transform: "translate(30%, -30%)",
            }}
          />

          <p
            className="text-xs font-semibold text-muted-foreground uppercase mb-1"
            style={{ letterSpacing: "0.09em" }}
          >
            Today's Net
          </p>

          {heroLoading ? (
            <Skeleton className="h-12 w-40 rounded-xl mt-1" />
          ) : (
            <div className="flex items-end gap-3 flex-wrap">
              <span
                className="font-bold tabular-nums leading-none"
                style={{
                  fontSize: "clamp(2.2rem, 10vw, 3.5rem)",
                  letterSpacing: "-0.05em",
                  color: netPos ? "hsl(142 65% 36%)" : "hsl(4 86% 58%)",
                }}
              >
                {netPos ? "+" : "−"}
                {formatCurrency(Math.abs(netToday))}
              </span>
            </div>
          )}

          {/* In / Out chips */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight
                className="w-3.5 h-3.5"
                style={{ color: "hsl(142 65% 36%)" }}
                strokeWidth={2.5}
              />
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: "hsl(142 65% 36%)" }}
              >
                {heroLoading ? "—" : formatCurrency(todayIn)}
              </span>
              <span className="text-xs text-muted-foreground">in</span>
            </div>
            <div className="w-px h-4 bg-border/60" />
            <div className="flex items-center gap-1.5">
              <ArrowDownRight
                className="w-3.5 h-3.5"
                style={{ color: "hsl(4 86% 58%)" }}
                strokeWidth={2.5}
              />
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: "hsl(4 86% 58%)" }}
              >
                {heroLoading ? "—" : formatCurrency(todayOut)}
              </span>
              <span className="text-xs text-muted-foreground">out</span>
            </div>
          </div>
        </div>

        {/* ── Period tabs ──────────────────────────────────────────── */}
        <div className="flex items-center bg-muted rounded-2xl p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* ── KPI cards — 2×2 grid ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiLoading ? (
            [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : kpis.length === 0 ? (
            [
              { title: "Revenue",  value: "—", change: undefined, icon: "dollar-sign", variant: "default" as const },
              { title: "Profit",   value: "—", change: undefined, icon: "trending-up",  variant: "default" as const },
              { title: "Expenses", value: "—", change: undefined, icon: "receipt",      variant: "default" as const },
              { title: "Goals",    value: "—", change: undefined, icon: "target",       variant: "default" as const },
            ].map((k, i) => (
              <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <KPICard title={k.title} value={k.value} icon={kpiIcon(k.icon)} variant={k.variant} compact />
              </div>
            ))
          ) : (
            kpis.map((kpi, i) => (
              <div
                key={kpi.title}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => {
                  if (kpi.title === "Total Revenue")  setDrillDown("revenue");
                  if (kpi.title === "Total Profit")   setDrillDown("profit");
                  if (kpi.title === "Total Expenses") setDrillDown("expenses");
                }}
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.formattedValue}
                  change={kpi.change}
                  icon={kpiIcon(kpi.icon)}
                  variant={kpi.variant}
                  compact
                  onClick={
                    ["Total Revenue", "Total Profit", "Total Expenses"].includes(kpi.title)
                      ? () => {}
                      : undefined
                  }
                />
              </div>
            ))
          )}
        </div>

        {/* ── Revenue chart ─────────────────────────────────────────── */}
        <RevenueChart
          serviceId={serviceId !== "all" ? Number(serviceId) : undefined}
          startDate={range.from}
          endDate={range.to}
        />

        {/* ── Goals + Recent — two-column on desktop ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

          {/* Goal progress */}
          <GoalProgress
            serviceId={serviceId !== "all" ? Number(serviceId) : undefined}
          />

          {/* Recent entries */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Recent Entries</h3>
              <Link
                to="/entry"
                className="text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline"
              >
                Add <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : recentEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Minus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No entries yet</p>
                <Link
                  to="/entry"
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Add your first entry →
                </Link>
              </div>
            ) : (
              <div>
                {recentEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Index;

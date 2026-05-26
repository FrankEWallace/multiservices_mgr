import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entriesApi, servicesApi } from "@/lib/api";
import { useSettings } from "@/contexts/SettingsContext";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Delete,
  Check,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/* ─── Category definitions ─────────────────────────────────────────────────── */
const INCOME_CATEGORIES = [
  "Sales",
  "Service Fee",
  "Consultation",
  "Rental",
  "Interest",
  "Commission",
  "Refund",
  "Other",
];

const EXPENSE_CATEGORIES = [
  "Operations",
  "Salary",
  "Utilities",
  "Rent",
  "Marketing",
  "Maintenance",
  "Supplies",
  "Transport",
  "Equipment",
  "Other",
];

/* ─── Numpad keys ────────────────────────────────────────────────────────────── */
const NUMPAD_KEYS: (string | "del")[] = [
  "7", "8", "9",
  "4", "5", "6",
  "1", "2", "3",
  ".", "0", "del",
];

/* ─── Date helpers ────────────────────────────────────────────────────────── */
function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isToday(d: Date): boolean {
  const today = new Date();
  return toDateString(d) === toDateString(today);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/* ─── Amount display formatter ──────────────────────────────────────────────── */
function formatDisplayAmount(raw: string): string {
  if (!raw || raw === "0") return "0";
  const [intPart, decPart] = raw.split(".");
  const formatted = Number(intPart || "0").toLocaleString("en-US");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function Entry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getCurrency } = useSettings();
  const currency = getCurrency();

  /* ── State ── */
  const [type, setType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState<Date>(new Date());
  const [amountRaw, setAmountRaw] = useState("0");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  /* ── Data ── */
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });
  const services = servicesData?.services?.filter((s) => s.isActive) ?? [];

  /* ── Computed ── */
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Reset category if it doesn't exist in current type's list
  const activeCategory = categories.includes(category) ? category : "";

  const amountValue = useMemo(() => parseFloat(amountRaw) || 0, [amountRaw]);

  const currencySymbol = currency.symbol || "TSh";
  const currencyBefore = currency.position !== "after";

  /* ── Numpad handler ── */
  const handleKey = useCallback(
    (key: string | "del") => {
      if (key === "del") {
        setAmountRaw((prev) => {
          if (prev.length <= 1) return "0";
          const next = prev.slice(0, -1);
          return next === "" || next === "-" ? "0" : next;
        });
        return;
      }
      if (key === ".") {
        setAmountRaw((prev) => (prev.includes(".") ? prev : prev + "."));
        return;
      }
      // digit
      setAmountRaw((prev) => {
        if (prev === "0") return key;
        if (prev.length >= 12) return prev; // max 12 chars
        // max 2 decimal places
        const dotIdx = prev.indexOf(".");
        if (dotIdx !== -1 && prev.length - dotIdx > 2) return prev;
        return prev + key;
      });
    },
    []
  );

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        // reset form
        setAmountRaw("0");
        setCategory("");
        setNote("");
        setServiceId(null);
        setDate(new Date());
        setType("income");
      }, 1200);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save entry");
    },
  });

  const handleSave = () => {
    if (amountValue <= 0) {
      toast.error("Please enter an amount greater than zero");
      return;
    }
    mutation.mutate({
      type,
      amount: amountValue,
      serviceId: serviceId ?? undefined,
      category: activeCategory || undefined,
      description: note || undefined,
      date: toDateString(date),
    });
  };

  /* ── Colours ── */
  const isIncome = type === "income";
  const typeColor = isIncome
    ? "hsl(142 65% 36%)"   // --success green
    : "hsl(4 86% 58%)";    // --danger red

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout noPadding>
      <div className="flex flex-col min-h-[calc(100vh-64px)] md:min-h-0 md:max-w-md md:mx-auto md:py-8 md:px-0 px-0">

        {/* ── Type toggle ──────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center bg-muted rounded-2xl p-1 gap-1">
            <button
              onClick={() => setType("income")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                isIncome
                  ? "bg-background text-success shadow-sm"
                  : "text-muted-foreground"
              )}
              style={isIncome ? { color: "hsl(142 65% 36%)" } : undefined}
            >
              + Income
            </button>
            <button
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                !isIncome
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
              style={!isIncome ? { color: "hsl(4 86% 58%)" } : undefined}
            >
              − Expense
            </button>
          </div>
        </div>

        {/* ── Date navigation ──────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 px-4 py-2">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 active:scale-95 transition-all">
                <span className="text-sm font-semibold text-foreground">
                  {isToday(date) ? "Today" : formatDisplayDate(date)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                initialFocus
                disabled={(d) => d > new Date()}
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setDate((d) => {
              const next = addDays(d, 1);
              return next > new Date() ? d : next;
            })}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30"
            disabled={isToday(date)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Amount display ───────────────────────────────────────── */}
        <div className="flex items-end justify-center gap-2 px-6 py-4">
          {currencyBefore && (
            <span
              className="text-xl font-semibold mb-1.5"
              style={{ color: typeColor, opacity: 0.7 }}
            >
              {currencySymbol}
            </span>
          )}
          <span
            className="font-bold tabular-nums leading-none"
            style={{
              fontSize: "clamp(2.5rem, 14vw, 4.5rem)",
              letterSpacing: "-0.04em",
              color: typeColor,
            }}
          >
            {formatDisplayAmount(amountRaw)}
          </span>
          {!currencyBefore && (
            <span
              className="text-xl font-semibold mb-1.5"
              style={{ color: typeColor, opacity: 0.7 }}
            >
              {currencySymbol}
            </span>
          )}
        </div>

        {/* ── Service chips ─────────────────────────────────────────── */}
        {services.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setServiceId(null)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                  serviceId === null
                    ? "bg-primary text-white border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                No Service
              </button>
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                    serviceId === s.id
                      ? "text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                  )}
                  style={
                    serviceId === s.id
                      ? { backgroundColor: s.color || "hsl(var(--primary))", borderColor: s.color }
                      : {}
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Category chips ────────────────────────────────────────── */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === activeCategory ? "" : cat)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                  activeCategory === cat
                    ? "text-white border-transparent"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
                )}
                style={
                  activeCategory === cat
                    ? { backgroundColor: typeColor, borderColor: typeColor }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Note field ───────────────────────────────────────────── */}
        <div className="px-4 pb-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            maxLength={120}
            className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/60 border border-transparent focus:border-primary/40 focus:outline-none transition-colors"
          />
        </div>

        {/* ── Numpad ───────────────────────────────────────────────── */}
        <div className="px-4 pb-2 flex-1">
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((key, i) => {
              const isDel = key === "del";
              return (
                <button
                  key={i}
                  onPointerDown={(e) => {
                    e.preventDefault(); // prevent focus stealing from note
                    handleKey(key);
                  }}
                  className={cn(
                    "h-14 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all duration-100 select-none",
                    "active:scale-90 active:brightness-95",
                    isDel
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isDel ? (
                    <Delete className="w-5 h-5" />
                  ) : (
                    <span>{key}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Save button ──────────────────────────────────────────── */}
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={handleSave}
            disabled={mutation.isPending || saved || amountValue <= 0}
            className={cn(
              "w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all duration-200",
              "disabled:opacity-60 active:scale-[0.98]",
              saved
                ? "text-white"
                : amountValue <= 0
                ? "bg-muted text-muted-foreground"
                : "text-white shadow-lg active:shadow-sm"
            )}
            style={
              saved
                ? { backgroundColor: "hsl(142 65% 36%)" }
                : amountValue > 0
                ? {
                    backgroundColor: typeColor,
                    boxShadow: `0 4px 14px ${typeColor}55`,
                  }
                : {}
            }
          >
            {mutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-5 h-5" strokeWidth={2.5} />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save {isIncome ? "Income" : "Expense"}</span>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

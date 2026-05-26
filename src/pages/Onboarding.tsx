import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, servicesApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  ChevronRight,
  Check,
  Loader2,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const ONBOARDING_KEY = "meilleur_onboarded";

export function markOnboarded() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

/* ── Currency catalogue ── */
const CURRENCIES = [
  { code: "TSH", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling"    },
  { code: "USD", symbol: "$",   name: "US Dollar"          },
  { code: "EUR", symbol: "€",   name: "Euro"               },
  { code: "GBP", symbol: "£",   name: "British Pound"      },
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira"     },
  { code: "GHS", symbol: "₵",   name: "Ghanaian Cedi"      },
  { code: "ZAR", symbol: "R",   name: "South African Rand" },
  { code: "INR", symbol: "₹",   name: "Indian Rupee"       },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar"  },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar"    },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen"       },
];

/* ── Service colour palette ── */
const SERVICE_COLORS = [
  { label: "Blue",   value: "#4F6EF7" },
  { label: "Violet", value: "#7C5CE4" },
  { label: "Green",  value: "#22A672" },
  { label: "Amber",  value: "#F59E0B" },
  { label: "Rose",   value: "#F43F5E" },
  { label: "Cyan",   value: "#06B6D4" },
];

/* ─── Step dots ────────────────────────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === current
              ? "w-6 h-2 bg-primary"
              : i < current
              ? "w-2 h-2 bg-primary/40"
              : "w-2 h-2 bg-border",
          )}
        />
      ))}
    </div>
  );
}

/* ─── Onboarding wizard ─────────────────────────────────────────────────────── */
export default function Onboarding() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [step, setStep] = useState(0);

  /* ── Step 1 state ── */
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency]       = useState(CURRENCIES[0]);

  /* ── Step 2 state ── */
  const [serviceName, setServiceName]   = useState("");
  const [serviceColor, setServiceColor] = useState(SERVICE_COLORS[0].value);
  const [monthlyTarget, setMonthlyTarget] = useState("");

  /* ── Mutations ── */
  const settingsMut = useMutation({
    mutationFn: settingsApi.bulkUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const serviceMut = useMutation({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  /* ── Handlers ── */
  async function handleStep1Next() {
    try {
      await settingsMut.mutateAsync([
        { key: "company.name",        value: companyName || "My Business", category: "company",  type: "string" },
        { key: "currency.code",       value: currency.code,                category: "currency", type: "string" },
        { key: "currency.symbol",     value: currency.symbol,              category: "currency", type: "string" },
        { key: "currency.position",   value: "before",                     category: "currency", type: "string" },
        { key: "currency.decimalPlaces", value: 2,                         category: "currency", type: "number" },
      ]);
      setStep(1);
    } catch {
      toast.error("Couldn't save settings — you can update them later in Settings.");
      setStep(1); // let them continue anyway
    }
  }

  async function handleStep2Next(skip = false) {
    if (!skip && serviceName.trim()) {
      try {
        await serviceMut.mutateAsync({
          name:         serviceName.trim(),
          color:        serviceColor,
          icon:         "building-2",
          isActive:     true,
          monthlyTarget: monthlyTarget ? Number(monthlyTarget) : undefined,
        });
      } catch {
        toast.error("Couldn't create service — you can add services later.");
      }
    }
    setStep(2);
  }

  function handleFinish() {
    markOnboarded();
    navigate("/");
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "hsl(229 92% 63%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" strokeWidth={1.8} />
          </div>
        </div>

        {/* Step dots */}
        <div className="mb-8 animate-fade-in">
          <StepDots current={step} total={3} />
        </div>

        {/* ── Step 0: Currency & Business ─────────────────────────── */}
        {step === 0 && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center">
              <h1
                className="font-bold text-foreground"
                style={{ fontSize: "1.75rem", letterSpacing: "-0.03em" }}
              >
                Let's set things up
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Tell us about your business and choose your currency.
              </p>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <Label htmlFor="company">Business name</Label>
              <Input
                id="company"
                placeholder="e.g. Acme Mining Co."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Currency grid */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 px-2 rounded-2xl border text-center transition-all duration-150 active:scale-95",
                      currency.code === c.code
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border bg-transparent text-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="text-lg font-bold leading-none">{c.symbol}</span>
                    <span className="text-[10px] font-semibold mt-1 opacity-70">{c.code}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {currency.name} · {currency.symbol}
              </p>
            </div>

            <button
              onClick={handleStep1Next}
              disabled={settingsMut.isPending}
              className="w-full h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ boxShadow: "0 4px 14px hsl(229 92% 63% / 0.35)" }}
            >
              {settingsMut.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Step 1: First Service ─────────────────────────────── */}
        {step === 1 && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center">
              <h1
                className="font-bold text-foreground"
                style={{ fontSize: "1.75rem", letterSpacing: "-0.03em" }}
              >
                Add your first service
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Services group your revenue and expenses. You can add more later.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svcName">Service name</Label>
              <Input
                id="svcName"
                placeholder="e.g. Mining Operations"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Colour picker */}
            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex items-center gap-3">
                {SERVICE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setServiceColor(c.value)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{ backgroundColor: c.value }}
                    aria-label={c.label}
                  >
                    {serviceColor === c.value && (
                      <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target">Monthly target ({currency.symbol}, optional)</Label>
              <Input
                id="target"
                type="number"
                placeholder="e.g. 5000"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleStep2Next(false)}
                disabled={serviceMut.isPending || !serviceName.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ boxShadow: "0 4px 14px hsl(229 92% 63% / 0.35)" }}
              >
                {serviceMut.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Add Service <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => handleStep2Next(true)}
                disabled={serviceMut.isPending}
                className="w-full h-10 rounded-2xl text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Tour / You're all set ─────────────────────── */}
        {step === 2 && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" strokeWidth={1.8} />
                </div>
              </div>
              <h1
                className="font-bold text-foreground"
                style={{ fontSize: "1.75rem", letterSpacing: "-0.03em" }}
              >
                You're all set!
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Here's a quick look at what you can do.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: PlusCircle,
                  color: "hsl(229 92% 63%)",
                  bg:    "hsl(229 92% 63% / 0.1)",
                  title: "Record entries",
                  desc:  "Tap the Entry tab to log income or expenses in seconds with the numpad.",
                },
                {
                  icon: LayoutDashboard,
                  color: "hsl(262 80% 62%)",
                  bg:    "hsl(262 80% 62% / 0.1)",
                  title: "Live dashboard",
                  desc:  "Your net profit, KPIs, and recent entries update the moment you save.",
                },
                {
                  icon: FileText,
                  color: "hsl(142 65% 36%)",
                  bg:    "hsl(142 65% 36% / 0.1)",
                  title: "Smart reports",
                  desc:  "Daily, weekly, and monthly breakdowns with service-by-service insight.",
                },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className="w-full h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 4px 14px hsl(229 92% 63% / 0.35)" }}
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

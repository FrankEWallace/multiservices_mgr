import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PlusCircle } from "lucide-react";

// Phase 4 will replace this with the full MoneyMgr-style entry screen
// (numpad amount, income/expense toggle, category picker, service, date, save)
export default function Entry() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <PlusCircle className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2" style={{ letterSpacing: "-0.03em" }}>
          New Entry
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          The full entry screen with numpad, category picker, and service selector is coming in Phase 4.
        </p>
      </div>
    </DashboardLayout>
  );
}

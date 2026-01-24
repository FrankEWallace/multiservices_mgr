import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, subYears } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presetRanges = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 Days", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 Days", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Last 3 Months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 Months", getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "This Year", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Last Year", getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfMonth(subMonths(startOfYear(new Date()), 1)) }) },
  { label: "Last 12 Months", getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value.to);

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const { from, to } = preset.getValue();
    onChange({ from, to, label: preset.label });
    setOpen(false);
    setCustomMode(false);
  };

  const handleCustomApply = () => {
    if (tempFrom && tempTo) {
      onChange({
        from: tempFrom,
        to: tempTo,
        label: `${format(tempFrom, "MMM d")} - ${format(tempTo, "MMM d, yyyy")}`,
      });
      setOpen(false);
      setCustomMode(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>{value.label}</span>
          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!customMode ? (
          <div className="p-2 space-y-1">
            <p className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Quick Select</p>
            {presetRanges.map((preset) => (
              <Button
                key={preset.label}
                variant={value.label === preset.label ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <div className="border-t pt-2 mt-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setCustomMode(true)}
              >
                Custom Range...
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Start Date</p>
                <Calendar
                  mode="single"
                  selected={tempFrom}
                  onSelect={setTempFrom}
                  disabled={(date) => date > new Date() || (tempTo ? date > tempTo : false)}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">End Date</p>
                <Calendar
                  mode="single"
                  selected={tempTo}
                  onSelect={setTempTo}
                  disabled={(date) => date > new Date() || (tempFrom ? date < tempFrom : false)}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setCustomMode(false)}>
                Back
              </Button>
              <Button onClick={handleCustomApply} disabled={!tempFrom || !tempTo}>
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Default date range
export const getDefaultDateRange = (): DateRange => ({
  from: startOfMonth(new Date()),
  to: new Date(),
  label: "This Month",
});

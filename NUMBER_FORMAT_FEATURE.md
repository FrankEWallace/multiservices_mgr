# Number Format Preference Feature

## Overview
Added user-configurable number format preference to ensure consistency in how numbers are displayed throughout the application. Users can choose between abbreviated format (1.5K, 2.3M, 1.2B) or full numbers (1,500, 2,300,000).

## What Was Implemented

### 1. Number Formatting Utilities (`src/lib/number-utils.ts`)
Created comprehensive number formatting functions:

- **`formatNumber(value, format, decimals)`**: Core function that formats numbers based on user preference
  - `abbreviated`: Converts large numbers to K (thousands), M (millions), B (billions)
  - `full`: Displays full numbers with comma separators (e.g., 1,500, 2,300,000)
  
- **`formatCurrency(value, currency, format, showSymbol)`**: Formats currency values
  - Applies number format preference
  - Adds currency symbol (TSh, USD, etc.)
  
- **`formatPercentage(value, decimals)`**: Formats percentage values
  - Consistent decimal places
  - Adds % symbol

### 2. Settings UI (`src/pages/Settings.tsx`)
Added **Display Preferences** section:
```tsx
<div className="glass-card p-6">
  <div className="flex items-center gap-3 mb-6">
    <Palette className="w-5 h-5 text-primary" />
    <h3 className="section-title">Display Preferences</h3>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label htmlFor="numberFormat">Number Format</Label>
      <Select value={getSetting("display.numberFormat") as string}>
        <SelectContent>
          <SelectItem value="abbreviated">Abbreviated (1.5K, 2.3M, 1.2B)</SelectItem>
          <SelectItem value="full">Full Numbers (1,500, 2,300,000)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Choose how numbers are displayed throughout the application
      </p>
    </div>
  </div>
</div>
```

### 3. Settings Context (`src/contexts/SettingsContext.tsx`)
Enhanced SettingsContext with `getNumberFormat()`:
```typescript
const getNumberFormat = (): "abbreviated" | "full" => {
  const format = getSetting("display.numberFormat", "abbreviated");
  return format === "full" ? "full" : "abbreviated";
};
```

### 4. Number Format Hook (`src/hooks/use-number-format.ts`)
Created reusable hook for easy number formatting:
```typescript
export function useNumberFormat() {
  const { getNumberFormat, getCurrency } = useSettings();
  const numberFormat = getNumberFormat();
  const currency = getCurrency();

  const formatNumber = (value: number, decimals?: number): string => {
    return formatNumberUtil(value, numberFormat, decimals);
  };

  const formatCurrency = (value: number, showSymbol: boolean = true): string => {
    return formatCurrencyUtil(value, currency.symbol, numberFormat, showSymbol);
  };

  return { formatNumber, formatCurrency, numberFormat };
}
```

### 5. Dashboard Integration (`src/pages/Index.tsx`)
Applied number formatting to Dashboard KPIs:
```typescript
const { formatCurrency } = useNumberFormat();

const filteredKPIs = kpiData?.kpis
  .filter(kpi => !kpi.title.toLowerCase().includes("debt"))
  .slice(0, 3)
  .map(kpi => ({
    ...kpi,
    formattedValue: formatCurrency(kpi.value),
  })) || [];
```

### 6. Database Setting
Added setting to database:
```sql
INSERT INTO settings (key, value, category, type, label, description, is_public)
VALUES (
  'display.numberFormat',
  'abbreviated',
  'display',
  'string',
  'Number Format',
  'Choose how large numbers are displayed (abbreviated: 1.5K, 2.3M or full: 1,500, 2,300,000)',
  1
);
```

## How It Works

1. **User selects preference** in Settings → Display Preferences → Number Format
2. **Setting saved** to database (`display.numberFormat`)
3. **SettingsContext** provides `getNumberFormat()` function
4. **Components use hook**: `const { formatCurrency } = useNumberFormat()`
5. **Numbers formatted** based on user preference throughout app

## Examples

### Abbreviated Format (Default)
- Revenue: **TSh 2.5M** instead of TSh 2,500,000
- Profit: **TSh 1.2K** instead of TSh 1,200
- Expenses: **TSh 850K** instead of TSh 850,000
- Goal: **TSh 5.0M** instead of TSh 5,000,000

### Full Number Format
- Revenue: **TSh 2,500,000**
- Profit: **TSh 1,200**
- Expenses: **TSh 850,000**
- Goal: **TSh 5,000,000**

## Benefits

1. **Consistency**: All numbers displayed the same way throughout the app
2. **User Control**: Users choose their preferred format
3. **Better Readability**: Abbreviated format makes large numbers easier to scan
4. **Flexibility**: Easy to switch between formats for different use cases
5. **Scalability**: Easy to apply to any component using the hook

## Next Steps

To apply number formatting to other pages:

1. **Import the hook**:
   ```typescript
   import { useNumberFormat } from "@/hooks/use-number-format";
   ```

2. **Use in component**:
   ```typescript
   const { formatCurrency, formatNumber } = useNumberFormat();
   ```

3. **Format values**:
   ```typescript
   <div>{formatCurrency(expense.amount)}</div>
   <div>{formatNumber(total)}</div>
   ```

## Files Changed

- ✅ `src/lib/number-utils.ts` - New file with formatting utilities
- ✅ `src/hooks/use-number-format.ts` - New hook for easy formatting
- ✅ `src/contexts/SettingsContext.tsx` - Added getNumberFormat()
- ✅ `src/pages/Settings.tsx` - Added Display Preferences UI
- ✅ `src/pages/Index.tsx` - Applied formatting to Dashboard KPIs
- ✅ Database setting added: `display.numberFormat`

## Testing

Test the feature:
1. Go to Settings → Display Preferences
2. Toggle between "Abbreviated" and "Full Numbers"
3. Save settings
4. Navigate to Dashboard
5. Observe KPI values change format immediately

## Shneiderman's Rule 1 Compliance

This feature directly supports **Shneiderman's Rule 1: Strive for Consistency** by:
- ✅ Providing consistent number display throughout the application
- ✅ Giving users control over their preferred format
- ✅ Making the codebase consistent with a single formatting approach
- ✅ Documenting the standard for future development

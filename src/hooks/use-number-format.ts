import { useSettings } from "@/contexts/SettingsContext";
import { formatNumber as formatNumberUtil, formatCurrency as formatCurrencyUtil } from "@/lib/number-utils";

/**
 * Hook to format numbers according to user's display preference
 */
export function useNumberFormat() {
  const { getNumberFormat, getCurrency } = useSettings();
  const numberFormat = getNumberFormat();
  const currency = getCurrency();

  /**
   * Format a number according to user's preference (abbreviated or full)
   */
  const formatNumber = (value: number, decimals?: number): string => {
    return formatNumberUtil(value, numberFormat, decimals);
  };

  /**
   * Format a currency value with the user's currency settings and display preference
   */
  const formatCurrency = (value: number, showSymbol: boolean = true): string => {
    return formatCurrencyUtil(
      value,
      currency.symbol,
      numberFormat,
      showSymbol
    );
  };

  return {
    formatNumber,
    formatCurrency,
    numberFormat,
  };
}

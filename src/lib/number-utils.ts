/**
 * Consistent number formatting utilities
 * Ensures numbers are displayed consistently based on user preference
 */

export type NumberFormat = 'abbreviated' | 'full';

/**
 * Format a number based on user's display preference
 * @param value - The number to format
 * @param format - 'abbreviated' (1.5K, 2.3M) or 'full' (1,500, 2,300,000)
 * @param decimals - Number of decimal places for abbreviated format (default: 1)
 */
export function formatNumber(
  value: number | string | null | undefined,
  format: NumberFormat = 'abbreviated',
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  if (format === 'full') {
    // Full format with thousand separators: 1,500,000
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  
  // Abbreviated format: 1.5K, 2.3M, 1.2B
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1_000_000_000) {
    // Billions
    return sign + (absNum / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (absNum >= 1_000_000) {
    // Millions
    return sign + (absNum / 1_000_000).toFixed(decimals) + 'M';
  } else if (absNum >= 1_000) {
    // Thousands
    return sign + (absNum / 1_000).toFixed(decimals) + 'K';
  } else {
    // Less than 1000, show full number
    return sign + absNum.toFixed(0);
  }
}

/**
 * Format currency with number format preference
 * @param value - The amount to format
 * @param currency - Currency symbol (default: 'TSh')
 * @param format - Number format preference
 * @param showSymbol - Whether to show currency symbol (default: true)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'TSh',
  format: NumberFormat = 'abbreviated',
  showSymbol: boolean = true
): string {
  const formattedNumber = formatNumber(value, format);
  
  if (!showSymbol) return formattedNumber;
  
  return `${currency} ${formattedNumber}`;
}

/**
 * Format percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') return '0%';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0%';
  
  return num.toFixed(decimals) + '%';
}

/**
 * Get friendly label for number format
 */
export function getNumberFormatLabel(format: NumberFormat): string {
  return format === 'abbreviated' ? 'Abbreviated (1.5K, 2.3M)' : 'Full (1,500, 2,300,000)';
}

/**
 * Example outputs for both formats (for UI display)
 */
export const NUMBER_FORMAT_EXAMPLES = {
  abbreviated: {
    thousands: '1.5K',
    millions: '2.3M',
    billions: '1.2B',
  },
  full: {
    thousands: '1,500',
    millions: '2,300,000',
    billions: '1,200,000,000',
  },
} as const;

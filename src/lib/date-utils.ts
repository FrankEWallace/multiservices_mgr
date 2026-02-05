/**
 * Consistent date formatting utilities for the application
 * Ensures all dates display in the same format throughout
 */

export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY', // e.g., 05/02/2026
  LONG: 'DD MMM YYYY', // e.g., 05 Feb 2026
  FULL: 'dddd, DD MMMM YYYY', // e.g., Thursday, 05 February 2026
  TIME: 'HH:mm', // e.g., 14:30
  DATETIME: 'DD/MM/YYYY HH:mm', // e.g., 05/02/2026 14:30
  ISO: 'YYYY-MM-DD', // e.g., 2026-02-05 (for inputs)
} as const;

/**
 * Format a date consistently across the application
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: keyof typeof DATE_FORMATS = 'SHORT'
): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  
  switch (format) {
    case 'SHORT':
      return `${day}/${month}/${year}`;
    case 'LONG':
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'FULL':
      return `${dayNames[d.getDay()]}, ${day} ${monthNamesFull[d.getMonth()]} ${year}`;
    case 'TIME':
      return `${hours}:${minutes}`;
    case 'DATETIME':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'ISO':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a date for use in <input type="date"> elements
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  return formatDate(date, 'ISO');
}

/**
 * Get a relative time string (e.g., "2 days ago", "in 3 hours")
 * Use this sparingly - prefer absolute dates for clarity
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 7) {
    // If more than a week, show absolute date
    return formatDate(d, 'SHORT');
  }
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffSecs > 0) return `${diffSecs} second${diffSecs > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Get date range display
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  format: keyof typeof DATE_FORMATS = 'SHORT'
): string {
  return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Get the start of today (00:00:00)
 */
export function getToday(): string {
  return formatDateForInput(new Date());
}

/**
 * Get a date N days from today
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}

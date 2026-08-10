import { format } from 'date-fns';

/**
 * Format a date+time to 12-hour mode: "dd MMM, h:mm aa"
 * e.g. "07 Aug, 2:35 PM"
 */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM, h:mm aa');
}

/**
 * Format a date+time with full year: "MMM dd, yyyy h:mm aa"
 * e.g. "Aug 07, 2026 2:35 PM"
 */
export function formatDateTimeFull(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy h:mm aa');
}

/**
 * Format only time in 12-hour mode: "h:mm aa"
 * e.g. "2:35 PM"
 */
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm aa');
}

/**
 * Format only date (no time): "dd MMM yyyy"
 * e.g. "07 Aug 2026"
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

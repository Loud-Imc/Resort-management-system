import { format, parseISO, addDays, differenceInDays } from 'date-fns';

/**
 * Enterprise Hospitality Date Utility (DateUtils)
 * 
 * Single Source of Truth for Date Formatting, Parsing, and Interval Overlap Calculations.
 * Ensures consistent behavior across CP, PMS, RouteGuide OTA, Reports, and Channex Manager.
 */
export class DateUtils {
  /**
   * Convert any Date object or ISO date string into a canonical local 'yyyy-MM-dd' calendar string.
   */
  static toCalendarDateStr(dateInput: Date | string | number): string {
    if (!dateInput) return '';

    if (typeof dateInput === 'string') {
      // If it's already a clean 'yyyy-MM-dd' string, return it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
        return dateInput.trim();
      }
      // If it's an ISO timestamp string or Date representation
      const parsed = parseISO(dateInput);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
      // Fallback native Date parse
      const nativeParsed = new Date(dateInput);
      if (!isNaN(nativeParsed.getTime())) {
        return format(nativeParsed, 'yyyy-MM-dd');
      }
      return dateInput;
    }

    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return '';
      return format(dateInput, 'yyyy-MM-dd');
    }

    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
  }

  /**
   * Parse a 'yyyy-MM-dd' string or Date into a Date object representing local start-of-day (00:00:00.000).
   */
  static parseCalendarDate(dateInput: Date | string): Date {
    if (dateInput instanceof Date) {
      const copy = new Date(dateInput);
      copy.setHours(0, 0, 0, 0);
      return copy;
    }

    const str = this.toCalendarDateStr(dateInput);
    if (!str) return new Date();

    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Returns today's date formatted as a local 'yyyy-MM-dd' calendar string.
   */
  static getTodayStr(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  /**
   * Checks if two stay/offer intervals [startA, endA) and [startB, endB) overlap.
   * Uses strict '<' inequality for checkout mornings:
   * Two intervals overlap if and only if: startA < endB AND startB < endA
   */
  static areNightIntervalsOverlapping(
    startA: Date | string,
    endA: Date | string,
    startB: Date | string,
    endB: Date | string
  ): boolean {
    const sA = this.toCalendarDateStr(startA);
    const eA = this.toCalendarDateStr(endA);
    const sB = this.toCalendarDateStr(startB);
    const eB = this.toCalendarDateStr(endB);

    if (!sA || !eA || !sB || !eB) return false;

    return sA < eB && sB < eA;
  }

  /**
   * Checks if a single stay night (yyyy-MM-dd) falls within an offer or rule's validity range [offerStart, offerEnd).
   */
  static isNightInOfferRange(
    nightDateStr: Date | string,
    offerStart: Date | string,
    offerEnd: Date | string
  ): boolean {
    const night = this.toCalendarDateStr(nightDateStr);
    const start = this.toCalendarDateStr(offerStart);
    const end = this.toCalendarDateStr(offerEnd);

    if (!night || !start || !end) return false;

    return start <= night && night < end;
  }

  /**
   * Returns an array of 'yyyy-MM-dd' strings for every night of a stay [checkIn, checkOut).
   */
  static getStayNights(checkIn: Date | string, checkOut: Date | string): string[] {
    const start = this.parseCalendarDate(checkIn);
    const end = this.parseCalendarDate(checkOut);
    const nights: string[] = [];

    let current = new Date(start);
    while (current < end) {
      nights.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }

    return nights;
  }

  /**
   * Returns total number of nights for a stay [checkIn, checkOut).
   */
  static getNumberOfNights(checkIn: Date | string, checkOut: Date | string): number {
    const start = this.parseCalendarDate(checkIn);
    const end = this.parseCalendarDate(checkOut);
    const diff = differenceInDays(end, start);
    return Math.max(1, diff);
  }
}

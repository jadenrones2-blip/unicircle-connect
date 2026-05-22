import { format, parseISO } from 'date-fns';

/** "Mon, Jan 15" */
export function formatEventDate(iso: string): string {
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return iso;
  }
}

/** "3:00 PM" */
export function formatEventTime(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return iso;
  }
}

/** "Monday, January 15, 2025" */
export function formatEventDateLong(iso: string): string {
  try {
    return format(parseISO(iso), 'EEEE, MMMM d, yyyy');
  } catch {
    return iso;
  }
}

/** "Jan 15 · 3:00 PM" */
export function formatEventDateTimeShort(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, h:mm a');
  } catch {
    return iso;
  }
}

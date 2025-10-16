/**
 * Date utility functions for the application
 */

/**
 * Convert local datetime-local string to UTC ISO format
 */
export function localDateTimeToUtcIso(local: string): string {
  return new Date(local).toISOString();
}

/**
 * Convert local date (YYYY-MM-DD) to UTC ISO format with appropriate time
 * - If date is today: use current time
 * - If date is in the past: use start of day in local timezone (00:00:00)
 * - If date is in the future: use start of day in local timezone (00:00:00)
 */
export function localDateToUtcIso(localDate: string): string {
  // Parse the date parts
  const [year, month, day] = localDate.split("-").map(Number);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Create date in local timezone (month is 0-indexed)
  const selectedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  // If selected date is today, use current time
  if (
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate()
  ) {
    return now.toISOString();
  }

  // For past or future dates, use start of day in local timezone
  return selectedDate.toISOString();
}

/**
 * Convert UTC ISO string to local datetime-local format
 */
export function utcIsoToLocalDateTime(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format a date to local display string
 */
export function formatLocalDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Format a date to local time only
 */
export function formatLocalTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Get max future date (+30 days from now) in YYYY-MM-DD format
 */
export function getMaxFutureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if date is in the past
 */
export function isPast(iso: string): boolean {
  return new Date(iso) < new Date();
}

/**
 * Check if date is today or in the future
 */
export function isTodayOrFuture(iso: string): boolean {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Calculate hours since a date
 */
export function hoursSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * Calculate countdown to a future date
 */
export function getCountdown(iso: string): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const diff = new Date(iso).getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
}

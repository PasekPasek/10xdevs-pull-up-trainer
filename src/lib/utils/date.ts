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
 * Get max future date (+30 days from now)
 */
export function getMaxFutureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return utcIsoToLocalDateTime(date.toISOString());
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

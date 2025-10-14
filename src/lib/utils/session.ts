import type { SessionSets } from "@/types";

/**
 * Session utility functions
 */

/**
 * Calculate total reps from sets
 */
export function computeTotal(sets: (number | null)[]): number {
  return sets.reduce((sum, v) => sum + (v ?? 0), 0);
}

/**
 * Validate a set value (1-60 or null)
 */
export function isValidSet(value: number | null): boolean {
  if (value === null) return true;
  return Number.isInteger(value) && value >= 1 && value <= 60;
}

/**
 * Validate all sets
 */
export function areValidSets(sets: (number | null)[]): boolean {
  return sets.every(isValidSet);
}

/**
 * Check if at least one rep exists (required for completion)
 */
export function hasAtLeastOneRep(sets: (number | null)[]): boolean {
  return sets.some((s) => s !== null && s > 0);
}

/**
 * Normalize sets to SessionSets tuple
 */
export function normalizeSets(
  sets: (number | null)[]
): [number | null, number | null, number | null, number | null, number | null] {
  const normalized = [...sets];
  while (normalized.length < 5) {
    normalized.push(null);
  }
  return normalized.slice(0, 5) as SessionSets;
}

/**
 * Format sets for display (e.g., "12, 10, 8, -, -")
 */
export function formatSets(sets: (number | null)[]): string {
  return sets.map((s) => (s === null ? "-" : s.toString())).join(", ");
}

/**
 * Validate RPE (1-10 or null)
 */
export function isValidRpe(rpe: number | null | undefined): boolean {
  if (rpe === null || rpe === undefined) return true;
  return Number.isInteger(rpe) && rpe >= 1 && rpe <= 10;
}

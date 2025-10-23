import { useMemo } from "react";
import { calculatePasswordStrength } from "@/lib/validation/ui/registerForm.schema";

/**
 * Custom hook for calculating password strength
 * Memoizes the result to avoid unnecessary recalculations
 *
 * @param password - The password to evaluate
 * @returns Password strength information (strength level and percentage)
 */
export function usePasswordStrength(password: string) {
  return useMemo(() => {
    if (!password) {
      return { strength: "weak" as const, percentage: 0 };
    }
    return calculatePasswordStrength(password);
  }, [password]);
}

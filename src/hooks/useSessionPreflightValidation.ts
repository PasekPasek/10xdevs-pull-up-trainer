import { useMemo } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSessionValidation } from "@/lib/services/sessions/hooks";
import { localDateToUtcIso } from "@/lib/utils/date";
import type { SessionStatus } from "@/types";

interface UseSessionPreflightValidationParams {
  sessionDateLocal: string;
  status: SessionStatus;
  enabled?: boolean;
}

/**
 * Custom hook for session preflight validation
 * Debounces inputs and queries validation API
 * Extracts validation logic from SessionForm for reusability
 */
export function useSessionPreflightValidation({
  sessionDateLocal,
  status,
  enabled = true,
}: UseSessionPreflightValidationParams) {
  // Debounce values to avoid excessive API calls
  const debouncedDateLocal = useDebouncedValue(sessionDateLocal, 500);
  const debouncedStatus = useDebouncedValue(status, 500);

  // Convert to UTC for validation API
  const validationDateUtc = useMemo(() => {
    if (!debouncedDateLocal) return "";
    try {
      return localDateToUtcIso(debouncedDateLocal);
    } catch {
      return "";
    }
  }, [debouncedDateLocal]);

  // Preflight validation query
  const { data: validationData, isLoading: isValidating } = useSessionValidation(
    {
      sessionDate: validationDateUtc,
      status: debouncedStatus,
      ignoreRestWarning: false,
    },
    {
      enabled: enabled && Boolean(validationDateUtc && debouncedStatus),
    }
  );

  // Extract validation state
  const isBlocking = validationData?.blocking ?? false;
  const warnings = validationData?.warnings ?? [];

  return {
    isBlocking,
    warnings,
    isValidating,
  };
}

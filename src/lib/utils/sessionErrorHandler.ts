import { toast } from "sonner";
import { isHttpError } from "./httpError";

/**
 * Centralized error handler for session operations
 * Provides consistent error messaging and special case handling
 */
export function handleSessionError(error: unknown, action: string, onConflict?: () => void): void {
  // Handle optimistic lock failures (ETag conflicts)
  if (error instanceof Error && "code" in error && (error as { code?: string }).code === "OPTIMISTIC_LOCK_FAILURE") {
    onConflict?.();
    return;
  }

  // Handle HTTP errors
  if (isHttpError(error)) {
    // Special handling for 409 conflicts
    if (error.status === 409 && onConflict) {
      onConflict();
      return;
    }
    toast.error(error.message || `Failed to ${action} session`);
    return;
  }

  // Handle generic errors
  if (error instanceof Error) {
    toast.error(error.message || `Failed to ${action} session`);
    return;
  }

  // Fallback for unknown error types
  toast.error(`Failed to ${action} session`);
}

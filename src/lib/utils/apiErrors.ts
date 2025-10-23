import { type UseFormSetError, type FieldValues, type Path } from "react-hook-form";
import { isHttpError } from "./httpError";

/**
 * Parses API error details and sets field errors in React Hook Form
 * Useful for handling validation errors from the server (e.g., 400 Bad Request)
 *
 * @param error - The error from the API call
 * @param setError - React Hook Form's setError function
 * @returns True if field errors were set, false otherwise
 */
export function setFormErrorsFromApi<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>
): boolean {
  if (!isHttpError(error)) {
    return false;
  }

  // Handle validation errors (400) with field details
  if (error.status === 400 && error.details && typeof error.details === "object") {
    const details = error.details as Record<string, string[]>;
    let hasSetErrors = false;

    Object.entries(details).forEach(([field, messages]) => {
      const message = messages?.[0];
      if (message) {
        setError(field as Path<TFieldValues>, { message });
        hasSetErrors = true;
      }
    });

    return hasSetErrors;
  }

  return false;
}

/**
 * Gets a user-friendly error message from an API error
 * Falls back to a default message if none is available
 *
 * @param error - The error from the API call
 * @param defaultMessage - Default message to use if no specific message is available
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (isHttpError(error)) {
    return error.message || defaultMessage;
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  return defaultMessage;
}

/**
 * Checks if an error is a conflict error (409)
 */
export function isConflictError(error: unknown): boolean {
  return isHttpError(error) && error.status === 409;
}

/**
 * Checks if an error is a validation error (400)
 */
export function isValidationError(error: unknown): boolean {
  return isHttpError(error) && error.status === 400;
}

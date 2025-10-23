import { toast } from "sonner";
import { useLoginMutation, useRegisterMutation, useLogoutMutation } from "@/lib/services/auth/hooks";
import { isHttpError } from "@/lib/utils/httpError";

interface UseAuthMutationsOptions {
  onLoginSuccess?: (redirectPath?: string) => void;
  onRegisterSuccess?: (redirectPath?: string) => void;
  onLogoutSuccess?: () => void;
}

/**
 * Custom hook that encapsulates all authentication mutation logic
 * Provides a unified interface for auth operations with error handling
 * Follows the same pattern as useSessionActions
 */
export function useAuthMutations({ onLoginSuccess, onRegisterSuccess, onLogoutSuccess }: UseAuthMutationsOptions = {}) {
  const loginMutation = useLoginMutation({
    onSuccess: () => {
      // Success handling is done in component after redirect path is determined
      onLoginSuccess?.();
    },
    onError: (error) => {
      if (isHttpError(error)) {
        toast.error(error.message || "Invalid email or password");
      } else if (error instanceof Error) {
        toast.error(error.message || "An error occurred during login. Please try again.");
      } else {
        toast.error("An error occurred during login. Please try again.");
      }
    },
  });

  const registerMutation = useRegisterMutation({
    onSuccess: () => {
      toast.success("Account created successfully!");
      onRegisterSuccess?.();
    },
    onError: (error) => {
      // Error handling is done in component for granular control
      // (409 conflicts, 400 validation errors with field details)
      if (error instanceof Error) {
        globalThis.reportError?.(error);
      }
    },
  });

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      onLogoutSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to logout");
    },
  });

  const isProcessing = loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending;

  return {
    loginMutation,
    registerMutation,
    logoutMutation,
    isProcessing,
  };
}

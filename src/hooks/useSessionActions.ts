import { toast } from "sonner";
import {
  useCompleteSessionMutation,
  useDeleteSessionMutation,
  useFailSessionMutation,
  useStartSessionMutation,
  useUpdateSessionMutation,
} from "@/lib/services/sessions/hooks";

interface UseSessionActionsOptions {
  onSuccess?: () => void;
  onConflict?: () => void;
}

/**
 * Custom hook that encapsulates all session mutation logic
 * Provides a unified interface for session actions with error handling
 */
export function useSessionActions({ onSuccess, onConflict }: UseSessionActionsOptions = {}) {
  const startMutation = useStartSessionMutation({
    onSuccess: () => {
      toast.success("Session started");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    },
  });

  const completeMutation = useCompleteSessionMutation({
    onSuccess: () => {
      toast.success("Session completed");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to complete session");
    },
  });

  const failMutation = useFailSessionMutation({
    onSuccess: () => {
      toast.success("Session marked as failed");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to fail session");
    },
  });

  const updateMutation = useUpdateSessionMutation({
    onSuccess: () => {
      toast.success("Session updated");
      onSuccess?.();
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "OPTIMISTIC_LOCK_FAILURE"
      ) {
        onConflict?.();
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    },
  });

  const deleteMutation = useDeleteSessionMutation({
    onSuccess: () => {
      toast.success("Session deleted");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    },
  });

  const isProcessing =
    startMutation.isPending ||
    completeMutation.isPending ||
    failMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return {
    startMutation,
    completeMutation,
    failMutation,
    updateMutation,
    deleteMutation,
    isProcessing,
  };
}

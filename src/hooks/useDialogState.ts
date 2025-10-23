import { useState, useCallback } from "react";
import type { SessionDetailDTO } from "@/types";

export interface DialogState<T = SessionDetailDTO> {
  open: boolean;
  data?: T;
  etag?: string;
}

/**
 * Custom hook for managing dialog state
 * Provides open, close, and data management for a single dialog
 */
export function useDialogState<T = SessionDetailDTO>() {
  const [state, setState] = useState<DialogState<T>>({ open: false });

  const openDialog = useCallback((data: T, etag?: string) => {
    setState({ open: true, data, etag });
  }, []);

  const closeDialog = useCallback(() => {
    setState({ open: false });
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return {
    ...state,
    openDialog,
    closeDialog,
    setOpen,
  };
}

/**
 * Hook for managing multiple related dialogs (e.g., session action dialogs)
 */
export function useSessionDialogs() {
  const completeDialog = useDialogState();
  const failDialog = useDialogState();
  const deleteDialog = useDialogState();
  const editDialog = useDialogState();

  const closeAll = useCallback(() => {
    completeDialog.closeDialog();
    failDialog.closeDialog();
    deleteDialog.closeDialog();
    editDialog.closeDialog();
  }, [completeDialog, failDialog, deleteDialog, editDialog]);

  return {
    completeDialog,
    failDialog,
    deleteDialog,
    editDialog,
    closeAll,
  };
}

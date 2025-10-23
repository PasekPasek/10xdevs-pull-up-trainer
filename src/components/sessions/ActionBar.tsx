import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Play, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";

import type { SessionDetailDTO, CompleteSessionCommand } from "@/types";
import { useSessionActions } from "@/hooks/useSessionActions";
import { useSessionDialogs } from "@/hooks/useDialogState";
import { Button } from "@/components/ui/button";
import { SessionCompleteDialog } from "@/components/dashboard/SessionCompleteDialog";
import { EditSessionDialog, type EditSessionFormValues } from "@/components/dashboard/EditSessionDialog";
import { ConfirmActionDialog } from "@/components/dashboard/ConfirmActionDialog";
import { ETagConflictDialog } from "@/components/dashboard/ETagConflictDialog";
import { normalizeSets } from "@/lib/utils/session";
import { useQueryClient } from "@tanstack/react-query";

interface ActionBarProps {
  session: SessionDetailDTO;
  onStartSuccess?: () => void;
  onStartError?: (error: unknown) => void;
  onCompleteClick?: () => void;
  onCompleteSuccess?: () => void;
  onCompleteError?: (error: unknown) => void;
  onFailClick?: () => void;
  onFailSuccess?: () => void;
  onFailError?: (error: unknown) => void;
  onEditClick?: () => void;
  onEditSuccess?: () => void;
  onEditError?: (error: unknown) => void;
  onDeleteClick?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: unknown) => void;
}

export function ActionBar({ session, onDeleteSuccess }: ActionBarProps) {
  const queryClient = useQueryClient();
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Use custom hooks for dialog state and session actions
  const { completeDialog, failDialog, deleteDialog, editDialog } = useSessionDialogs();

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["session", session.id] });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  }, [queryClient, session.id]);

  const {
    startMutation,
    completeMutation,
    failMutation,
    updateMutation,
    deleteMutation,
    isProcessing: isAnyMutationLoading,
  } = useSessionActions({
    onSuccess: () => {
      invalidateQueries();
      completeDialog.closeDialog();
      failDialog.closeDialog();
      editDialog.closeDialog();
    },
    onConflict: () => {
      setConflictDialogOpen(true);
      editDialog.closeDialog();
    },
  });

  // Action handlers with useCallback
  const handleStart = useCallback(() => {
    startMutation.mutate({ sessionId: session.id });
  }, [startMutation, session.id]);

  const handleComplete = useCallback(
    (values: { sets: (number | null)[]; rpe?: number | null }) => {
      const command: CompleteSessionCommand = {
        sets: normalizeSets(values.sets),
        rpe: values.rpe ?? undefined,
      };
      completeMutation.mutate({ sessionId: session.id, command });
    },
    [completeMutation, session.id]
  );

  const handleFail = useCallback(() => {
    failMutation.mutate({ sessionId: session.id });
  }, [failMutation, session.id]);

  const handleEdit = useCallback(
    (values: EditSessionFormValues) => {
      const command = {
        sessionDate: values.sessionDate,
        sets: normalizeSets(values.sets),
        aiComment: values.aiComment?.trim() || null,
        markAsModified: true,
      };
      updateMutation.mutate({
        sessionId: session.id,
        command,
        etag: session.updatedAt,
      });
    },
    [updateMutation, session.id, session.updatedAt]
  );

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ sessionId: session.id });
    setPendingRedirect(true);
    if (onDeleteSuccess) {
      onDeleteSuccess();
    }
  }, [deleteMutation, session.id, onDeleteSuccess]);

  const handleRefresh = useCallback(async () => {
    setConflictDialogOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["session", session.id] });
    toast.success("Session data refreshed");
  }, [queryClient, session.id]);

  useEffect(() => {
    if (!pendingRedirect) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);

    return () => window.clearTimeout(timer);
  }, [pendingRedirect]);

  const hasActions = session.actions.length > 0;
  if (!hasActions) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {session.actions.includes("start") && (
          <Button onClick={handleStart} disabled={isAnyMutationLoading} className="gap-2">
            <Play className="h-4 w-4" />
            Start Session
          </Button>
        )}

        {session.actions.includes("complete") && (
          <Button onClick={() => completeDialog.openDialog(session)} disabled={isAnyMutationLoading} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Complete Session
          </Button>
        )}

        {session.actions.includes("fail") && (
          <Button
            onClick={() => failDialog.openDialog(session)}
            disabled={isAnyMutationLoading}
            variant="destructive"
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Fail Session
          </Button>
        )}

        {session.actions.includes("edit") && (
          <Button
            onClick={() => editDialog.openDialog(session, session.updatedAt)}
            disabled={isAnyMutationLoading}
            variant="outline"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}

        {session.actions.includes("delete") && (
          <Button
            onClick={() => deleteDialog.openDialog(session)}
            disabled={isAnyMutationLoading}
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Complete Dialog */}
      <SessionCompleteDialog
        open={completeDialog.open}
        session={completeDialog.data}
        isSubmitting={completeMutation.isPending}
        onOpenChange={completeDialog.setOpen}
        onSubmit={handleComplete}
      />

      {/* Edit Dialog */}
      <EditSessionDialog
        open={editDialog.open}
        session={editDialog.data}
        etag={editDialog.etag}
        isSubmitting={updateMutation.isPending}
        onOpenChange={editDialog.setOpen}
        onSubmit={handleEdit}
      />

      {/* Fail Confirmation Dialog */}
      <ConfirmActionDialog
        open={failDialog.open}
        title="Fail session"
        description="Are you sure you want to mark this session as failed? This action is irreversible."
        confirmLabel="Fail session"
        variant="destructive"
        isSubmitting={failMutation.isPending}
        onOpenChange={failDialog.setOpen}
        onConfirm={handleFail}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={deleteDialog.open}
        title="Delete session"
        description="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
        onOpenChange={deleteDialog.setOpen}
        onConfirm={handleDelete}
      />

      {/* ETag Conflict Dialog */}
      <ETagConflictDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} onRefresh={handleRefresh} />
    </>
  );
}

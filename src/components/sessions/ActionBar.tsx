import { useState } from "react";
import { toast } from "sonner";
import { Play, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";

import type { SessionDetailDTO, CompleteSessionCommand, SessionSets } from "@/types";
import {
  useStartSessionMutation,
  useCompleteSessionMutation,
  useFailSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
} from "@/lib/services/sessions/hooks";
import { Button } from "@/components/ui/button";
import { SessionCompleteDialog } from "@/components/dashboard/SessionCompleteDialog";
import { EditSessionDialog, type EditSessionFormValues } from "@/components/dashboard/EditSessionDialog";
import { ConfirmActionDialog } from "@/components/dashboard/ConfirmActionDialog";
import { ETagConflictDialog } from "@/components/dashboard/ETagConflictDialog";
import { isHttpError } from "@/lib/utils/httpError";
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

export function ActionBar({ session, onStartSuccess, onStartError, onDeleteSuccess, onDeleteError }: ActionBarProps) {
  const queryClient = useQueryClient();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Mutations
  const startMutation = useStartSessionMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session started successfully");
      onStartSuccess?.();
    },
    onError: (error) => {
      if (isHttpError(error)) {
        toast.error(error.message || "Failed to start session");
      } else {
        toast.error("Failed to start session");
      }
      onStartError?.(error);
    },
  });

  const completeMutation = useCompleteSessionMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session completed successfully");
      setCompleteDialogOpen(false);
    },
    onError: (error) => {
      if (isHttpError(error)) {
        toast.error(error.message || "Failed to complete session");
      } else {
        toast.error("Failed to complete session");
      }
    },
  });

  const failMutation = useFailSessionMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session marked as failed");
      setFailDialogOpen(false);
    },
    onError: (error) => {
      if (isHttpError(error)) {
        toast.error(error.message || "Failed to fail session");
      } else {
        toast.error("Failed to fail session");
      }
    },
  });

  const updateMutation = useUpdateSessionMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session updated successfully");
      setEditDialogOpen(false);
    },
    onError: (error) => {
      if (isHttpError(error)) {
        if (error.status === 409) {
          setConflictDialogOpen(true);
          setEditDialogOpen(false);
          return;
        }
        toast.error(error.message || "Failed to update session");
      } else {
        toast.error("Failed to update session");
      }
    },
  });

  const deleteMutation = useDeleteSessionMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session deleted successfully");
      setDeleteDialogOpen(false);
      // Navigate to dashboard after a brief delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
      onDeleteSuccess?.();
    },
    onError: (error) => {
      if (isHttpError(error)) {
        toast.error(error.message || "Failed to delete session");
      } else {
        toast.error("Failed to delete session");
      }
      onDeleteError?.(error);
    },
  });

  // Action handlers
  const handleStart = () => {
    startMutation.mutate({ sessionId: session.id });
  };

  const handleComplete = (values: { sets: SessionSets; rpe?: number | null }) => {
    const command: CompleteSessionCommand = {
      sets: values.sets,
      rpe: values.rpe ?? undefined,
    };
    completeMutation.mutate({ sessionId: session.id, command });
  };

  const handleFail = () => {
    failMutation.mutate({ sessionId: session.id });
  };

  const handleEdit = (values: EditSessionFormValues) => {
    const command = {
      sessionDate: values.sessionDate,
      sets: values.sets,
      aiComment: values.aiComment?.trim() || null,
      markAsModified: true,
    };
    updateMutation.mutate({
      sessionId: session.id,
      command,
      etag: session.updatedAt,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ sessionId: session.id });
  };

  const handleRefresh = async () => {
    setConflictDialogOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["session", session.id] });
    toast.success("Session data refreshed");
  };

  const hasActions = session.actions.length > 0;
  if (!hasActions) {
    return null;
  }

  const isAnyMutationLoading =
    startMutation.isPending ||
    completeMutation.isPending ||
    failMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

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
          <Button onClick={() => setCompleteDialogOpen(true)} disabled={isAnyMutationLoading} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Complete Session
          </Button>
        )}

        {session.actions.includes("fail") && (
          <Button
            onClick={() => setFailDialogOpen(true)}
            disabled={isAnyMutationLoading}
            variant="destructive"
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Fail Session
          </Button>
        )}

        {session.actions.includes("edit") && (
          <Button onClick={() => setEditDialogOpen(true)} disabled={isAnyMutationLoading} variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}

        {session.actions.includes("delete") && (
          <Button
            onClick={() => setDeleteDialogOpen(true)}
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
        open={completeDialogOpen}
        session={session}
        isSubmitting={completeMutation.isPending}
        onOpenChange={setCompleteDialogOpen}
        onSubmit={handleComplete}
      />

      {/* Edit Dialog */}
      <EditSessionDialog
        open={editDialogOpen}
        session={session}
        etag={session.updatedAt}
        isSubmitting={updateMutation.isPending}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEdit}
      />

      {/* Fail Confirmation Dialog */}
      <ConfirmActionDialog
        open={failDialogOpen}
        title="Fail session"
        description="Are you sure you want to mark this session as failed? This action is irreversible."
        confirmLabel="Fail session"
        variant="destructive"
        isSubmitting={failMutation.isPending}
        onOpenChange={setFailDialogOpen}
        onConfirm={handleFail}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={deleteDialogOpen}
        title="Delete session"
        description="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />

      {/* ETag Conflict Dialog */}
      <ETagConflictDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} onRefresh={handleRefresh} />
    </>
  );
}

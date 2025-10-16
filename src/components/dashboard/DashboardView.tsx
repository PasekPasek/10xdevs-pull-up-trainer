import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDashboardSnapshot, useInvalidateDashboard } from "@/lib/services/dashboard/hooks";
import { normalizeSets } from "@/lib/utils/session";
import {
  useCompleteSessionMutation,
  useDeleteSessionMutation,
  useFailSessionMutation,
  useStartSessionMutation,
  useUpdateSessionMutation,
} from "@/lib/services/sessions/hooks";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ActiveSessionCard } from "@/components/dashboard/ActiveSessionCard";
import { LastCompletedCard } from "@/components/dashboard/LastCompletedCard";
import { AIQuotaBadge } from "@/components/dashboard/AIQuotaBadge";
import { PrimaryCTAs } from "@/components/dashboard/PrimaryCTAs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SessionCompleteDialog } from "@/components/dashboard/SessionCompleteDialog";
import { ConfirmActionDialog } from "@/components/dashboard/ConfirmActionDialog";
import { EditSessionDialog, type EditSessionFormValues } from "@/components/dashboard/EditSessionDialog";
import { ETagConflictDialog } from "@/components/dashboard/ETagConflictDialog";
import { AIWizardModal } from "@/components/dashboard/AIWizardModal";
import { useDashboardContext } from "@/components/dashboard/DashboardContext";
import { hasNoQuota } from "@/components/dashboard/types";
import { toast } from "sonner";
import { AlertCircle, RefreshCcw } from "lucide-react";
import type { SessionDetailDTO } from "@/types";

function DashboardViewInner() {
  const invalidate = useInvalidateDashboard();
  const snapshotQuery = useDashboardSnapshot();
  const { setWizardState, closeWizard } = useDashboardContext();

  const [completeDialog, setCompleteDialog] = useState<{ open: boolean; session?: SessionDetailDTO }>({ open: false });
  const [failDialog, setFailDialog] = useState<{ open: boolean; session?: SessionDetailDTO }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; session?: SessionDetailDTO }>({ open: false });
  const [editDialog, setEditDialog] = useState<{ open: boolean; session?: SessionDetailDTO; etag?: string }>({
    open: false,
  });
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const snapshot = snapshotQuery.data;

  const startMutation = useStartSessionMutation({
    onSuccess: () => {
      toast.success("Session started");
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    },
  });

  const failMutation = useFailSessionMutation({
    onSuccess: () => {
      toast.success("Session marked as failed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to fail session");
    },
  });

  const completeMutation = useCompleteSessionMutation({
    onSuccess: () => {
      toast.success("Session completed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to complete session");
    },
  });

  const deleteMutation = useDeleteSessionMutation({
    onSuccess: () => {
      toast.success("Session deleted");
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    },
  });

  const updateMutation = useUpdateSessionMutation({
    onSuccess: () => {
      toast.success("Session updated");
      invalidate();
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "OPTIMISTIC_LOCK_FAILURE"
      ) {
        setConflictDialogOpen(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    },
  });

  const isProcessing =
    startMutation.isPending ||
    failMutation.isPending ||
    completeMutation.isPending ||
    deleteMutation.isPending ||
    updateMutation.isPending;

  const isLoading = snapshotQuery.isLoading;
  const isError = snapshotQuery.isError;

  const handleComplete = (session: SessionDetailDTO) => {
    setCompleteDialog({ open: true, session });
  };

  const handleFail = (session: SessionDetailDTO) => {
    setFailDialog({ open: true, session });
  };

  const handleDelete = (session: SessionDetailDTO) => {
    setDeleteDialog({ open: true, session });
  };

  const handleEdit = (session: SessionDetailDTO) => {
    setEditDialog({ open: true, session, etag: session.updatedAt ?? undefined });
  };

  const handleCreateAi = () => {
    if (!snapshot?.aiQuota) {
      setWizardState({ quota: undefined, step: "quota" });
      return;
    }

    // Check if user has no quota
    if (hasNoQuota(snapshot.aiQuota)) {
      setWizardState({
        quota: snapshot.aiQuota,
        step: "quota",
      });
      return;
    }

    // Check if user has existing sessions (not a new user)
    const hasExistingSessions = !!snapshot.lastCompletedSession;

    if (hasExistingSessions) {
      // Existing user: skip input, go straight to loading/generation
      setWizardState({
        quota: snapshot.aiQuota,
        step: "loading",
        maxPullups: undefined, // Don't set maxPullups for existing users
      });
    } else {
      // New user: show input form to collect maxPullups
      setWizardState({
        quota: snapshot.aiQuota,
        step: "input",
      });
    }
  };

  const handleCompleteSubmit = (values: { sets: (number | null)[]; rpe?: number | null }) => {
    const sessionId = completeDialog.session?.id;
    if (!sessionId) return;
    completeMutation.mutate({
      sessionId,
      command: {
        sets: normalizeSets(values.sets),
        rpe: values.rpe ?? undefined,
      },
    });
    setCompleteDialog({ open: false });
  };

  const handleFailConfirm = () => {
    const sessionId = failDialog.session?.id;
    if (!sessionId) return;
    failMutation.mutate({ sessionId });
    setFailDialog({ open: false });
  };

  const handleDeleteConfirm = () => {
    const sessionId = deleteDialog.session?.id;
    if (!sessionId) return;
    deleteMutation.mutate({ sessionId });
    setDeleteDialog({ open: false });
  };

  const handleEditSubmit = (values: EditSessionFormValues) => {
    const current = editDialog.session;
    if (!current || !editDialog.etag) return;
    updateMutation.mutate({
      sessionId: current.id,
      command: {
        sessionDate: values.sessionDate,
        sets: normalizeSets(values.sets),
        aiComment: values.aiComment ?? undefined,
      },
      etag: editDialog.etag,
    });
    setEditDialog({ open: false });
  };

  return (
    <>
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 md:px-0">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Track your pull-up sessions and create new plans.</p>
          </div>
          {snapshot?.aiQuota ? (
            <AIQuotaBadge quota={snapshot.aiQuota} />
          ) : isLoading ? (
            <Skeleton className="h-12 w-64" />
          ) : null}
        </header>

        {isError ? (
          <Alert variant="destructive" className="border-destructive/60 bg-destructive/10 text-destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4" aria-hidden="true" />
                Failed to load dashboard data. Please try again.
              </span>
              <Button variant="outline" size="sm" onClick={() => snapshotQuery.refetch()} className="gap-2">
                <RefreshCcw className="size-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="grid gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-6">
            {snapshot?.activeSession ? (
              <ActiveSessionCard
                session={snapshot.activeSession}
                onStart={(sessionId) => startMutation.mutate({ sessionId })}
                onComplete={handleComplete}
                onFail={handleFail}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isProcessing={isProcessing}
              />
            ) : null}

            {snapshot?.lastCompletedSession ? <LastCompletedCard session={snapshot.lastCompletedSession} /> : null}

            {snapshot ? (
              <PrimaryCTAs
                snapshot={snapshot}
                onCreateAi={handleCreateAi}
                onCreateManual={() => (window.location.href = "/sessions/new")}
                disabled={isProcessing}
              />
            ) : null}
          </div>
        )}
      </section>

      <SessionCompleteDialog
        open={completeDialog.open}
        session={completeDialog.session}
        onOpenChange={(open) => setCompleteDialog((prev) => ({ ...prev, open }))}
        onSubmit={handleCompleteSubmit}
        isSubmitting={completeMutation.isPending}
      />

      <ConfirmActionDialog
        open={failDialog.open}
        title="Mark session as failed"
        description="This action cannot be undone."
        confirmLabel="Fail session"
        variant="destructive"
        onOpenChange={(open) => setFailDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleFailConfirm}
        isSubmitting={failMutation.isPending}
      />

      <ConfirmActionDialog
        open={deleteDialog.open}
        title="Delete session"
        description="This will remove the session permanently."
        confirmLabel="Delete"
        variant="destructive"
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
        isSubmitting={deleteMutation.isPending}
      />

      <EditSessionDialog
        open={editDialog.open}
        session={editDialog.session}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
      />

      <ETagConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        onRefresh={() => snapshotQuery.refetch()}
      />

      <AIWizardModal
        quota={snapshot?.aiQuota}
        onSuccess={() => {
          toast.success("AI session created");
          invalidate();
          closeWizard();
        }}
      />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 5, // 5 seconds
    },
  },
});

function DashboardViewWithProviders() {
  const snapshotQuery = useDashboardSnapshot();
  const snapshot = snapshotQuery.data;

  return (
    <DashboardLayout quota={snapshot?.aiQuota}>
      <DashboardViewInner />
    </DashboardLayout>
  );
}

export default function DashboardView() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardViewWithProviders />
    </QueryClientProvider>
  );
}

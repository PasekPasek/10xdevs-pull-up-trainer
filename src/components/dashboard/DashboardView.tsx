import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDashboardSnapshot, useInvalidateDashboard } from "@/lib/services/dashboard/hooks";
import { normalizeSets } from "@/lib/utils/session";
import { useSessionActions } from "@/hooks/useSessionActions";
import { useSessionDialogs } from "@/hooks/useDialogState";
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
import { isFeatureEnabled } from "@/features";
import { toast } from "sonner";
import { AlertCircle, RefreshCcw } from "lucide-react";
import type { SessionDetailDTO } from "@/types";

function DashboardViewInner() {
  const invalidate = useInvalidateDashboard();
  const snapshotQuery = useDashboardSnapshot();
  const { setWizardState, closeWizard } = useDashboardContext();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Use custom hooks for dialog state and session actions
  const { completeDialog, failDialog, deleteDialog, editDialog } = useSessionDialogs();
  const { startMutation, completeMutation, failMutation, updateMutation, deleteMutation, isProcessing } =
    useSessionActions({
      onSuccess: invalidate,
      onConflict: () => setConflictDialogOpen(true),
    });

  const snapshot = snapshotQuery.data;

  const isLoading = snapshotQuery.isLoading;
  const isError = snapshotQuery.isError;

  // Check if AI features are enabled
  const aiEnabled = isFeatureEnabled("ENABLE_GENERATING_AI_SESSIONS");

  const handleComplete = useCallback(
    (session: SessionDetailDTO) => {
      completeDialog.openDialog(session);
    },
    [completeDialog]
  );

  const handleFail = useCallback(
    (session: SessionDetailDTO) => {
      failDialog.openDialog(session);
    },
    [failDialog]
  );

  const handleDelete = useCallback(
    (session: SessionDetailDTO) => {
      deleteDialog.openDialog(session);
    },
    [deleteDialog]
  );

  const handleEdit = useCallback(
    (session: SessionDetailDTO) => {
      editDialog.openDialog(session, session.updatedAt ?? undefined);
    },
    [editDialog]
  );

  const handleCreateAi = useCallback(() => {
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
  }, [snapshot, setWizardState]);

  const handleCompleteSubmit = useCallback(
    (values: { sets: (number | null)[]; rpe?: number | null }) => {
      const sessionId = completeDialog.data?.id;
      if (!sessionId) return;
      completeMutation.mutate({
        sessionId,
        command: {
          sets: normalizeSets(values.sets),
          rpe: values.rpe ?? undefined,
        },
      });
      completeDialog.closeDialog();
    },
    [completeDialog, completeMutation]
  );

  const handleFailConfirm = useCallback(() => {
    const sessionId = failDialog.data?.id;
    if (!sessionId) return;
    failMutation.mutate({ sessionId });
    failDialog.closeDialog();
  }, [failDialog, failMutation]);

  const handleDeleteConfirm = useCallback(() => {
    const sessionId = deleteDialog.data?.id;
    if (!sessionId) return;
    deleteMutation.mutate({ sessionId });
    deleteDialog.closeDialog();
  }, [deleteDialog, deleteMutation]);

  const handleEditSubmit = useCallback(
    (values: EditSessionFormValues) => {
      const current = editDialog.data;
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
      editDialog.closeDialog();
    },
    [editDialog, updateMutation]
  );

  return (
    <>
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 md:px-0">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Track your pull-up sessions and create new plans.</p>
          </div>
          {aiEnabled && snapshot?.aiQuota ? (
            <AIQuotaBadge quota={snapshot.aiQuota} />
          ) : aiEnabled && isLoading ? (
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
                aiEnabled={aiEnabled}
              />
            ) : null}
          </div>
        )}
      </section>

      <SessionCompleteDialog
        open={completeDialog.open}
        session={completeDialog.data}
        onOpenChange={completeDialog.setOpen}
        onSubmit={handleCompleteSubmit}
        isSubmitting={completeMutation.isPending}
      />

      <ConfirmActionDialog
        open={failDialog.open}
        title="Mark session as failed"
        description="This action cannot be undone."
        confirmLabel="Fail session"
        variant="destructive"
        onOpenChange={failDialog.setOpen}
        onConfirm={handleFailConfirm}
        isSubmitting={failMutation.isPending}
      />

      <ConfirmActionDialog
        open={deleteDialog.open}
        title="Delete session"
        description="This will remove the session permanently."
        confirmLabel="Delete"
        variant="destructive"
        onOpenChange={deleteDialog.setOpen}
        onConfirm={handleDeleteConfirm}
        isSubmitting={deleteMutation.isPending}
      />

      <EditSessionDialog
        open={editDialog.open}
        session={editDialog.data}
        onOpenChange={editDialog.setOpen}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
      />

      <ETagConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        onRefresh={() => snapshotQuery.refetch()}
      />

      {aiEnabled ? (
        <AIWizardModal
          quota={snapshot?.aiQuota}
          onSuccess={() => {
            toast.success("AI session created");
            invalidate();
            closeWizard();
          }}
        />
      ) : null}
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
